import {GetQueueUrlCommand, ReceiveMessageCommand, SQSClient,} from '@aws-sdk/client-sqs';
import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {QueueListener} from '../listener/queue-listener.interface';
import {MessageContext} from '../listener/message-context.interface';
import {MessageContextImpl} from '../listener/message-context.impl';
import {QueueListenerErrorHandler} from '../error/queue-listener-error-handler.interface';
import {DefaultQueueListenerErrorHandler} from '../error/default-queue-listener-error-handler';
import {PayloadMessagingConverter} from '../converter/payload-messaging-converter.interface';
import {JsonPayloadMessagingConverter} from '../converter/json-payload-messaging-converter';
import {ContainerOptions} from './container-options';
import {ContainerConfiguration} from '../types/container-configuration';
import {AcknowledgementMode} from '../types/acknowledgement-mode.enum';
import {SQSMessage} from '../types/sqs-types';
import {Semaphore} from './semaphore';
import {ValidationHandledError} from '../converter/validation-handled-error';
import {
    ContextResolver,
    ResourceProvider,
    ContextKeyGenerator,
    ResourceCleanup
} from '../types/context-resource-types';

/**
 * Main container class that manages the complete lifecycle of message consumption for a single SQS queue.
 *
 * Responsibilities:
 * - Poll SQS queue using long polling
 * - Convert raw messages to typed payloads
 * - Invoke the configured QueueListener
 * - Handle acknowledgement based on configured mode
 * - Manage lifecycle (start/stop)
 * - Handle errors via error handler
 * - Enforce concurrency limits
 * 
 * @template TPayload The type of the message payload
 * @template TContext The type of the context object (defaults to void for backward compatibility)
 * @template TResources The type of the resources object (defaults to void for backward compatibility)
 *
 * @example
 * ```typescript
 * // Basic usage without context/resources (backward compatible)
 * const container = new SqsMessageListenerContainer<OrderEvent>(sqsClient);
 *
 * container.configure(options => {
 *   options
 *     .queueName('order-queue')
 *     .pollTimeout(20)
 *     .maxConcurrentMessages(10)
 *     .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
 * });
 *
 * container.setId('orderListener');
 * container.setMessageListener(orderListener);
 * container.setErrorHandler(errorHandler);
 * 
 * // Advanced usage with context and resources
 * const container = new SqsMessageListenerContainer<OrderEvent, TenantContext, TenantResources>(sqsClient);
 * 
 * container.configure(options => {
 *   options
 *     .queueName('order-queue')
 *     .contextResolver((attributes) => ({
 *       tenantId: attributes['tenantId']?.StringValue!,
 *       region: attributes['region']?.StringValue!
 *     }))
 *     .resourceProvider(async (context) => ({
 *       dataSource: await getDataSource(context.tenantId, context.region)
 *     }));
 * });
 * ```
 */
@Injectable()
export class SqsMessageListenerContainer<TPayload, TContext = void, TResources = void> implements OnModuleInit, OnModuleDestroy {
    private config: ContainerConfiguration & { messageConverter?: PayloadMessagingConverter<TPayload> };
    private listener?: QueueListener<TPayload, TContext, TResources>;
    private errorHandler?: QueueListenerErrorHandler;
    private converter?: PayloadMessagingConverter<TPayload>;
    private semaphore?: Semaphore;
    private isRunning = false;
    private resolvedQueueUrl?: string;
    private inFlightMessages = 0;
    private readonly logger: Logger;
    private pollingPromise?: Promise<void>;
    private abortController?: AbortController;
    
    // Context and resource management properties
    private contextResolver?: ContextResolver<TContext>;
    private resourceProvider?: ResourceProvider<TContext, TResources>;
    private contextKeyGenerator?: ContextKeyGenerator<TContext>;
    private resourceCleanup?: ResourceCleanup<TResources>;
    private resourceCache: Map<string, TResources> = new Map();

    constructor(
        private readonly sqsClient: SQSClient,
        logger?: Logger
    ) {
        this.logger = logger || new Logger(SqsMessageListenerContainer.name);

        // Initialize with the default configuration
        this.config = {
            id: '',
            queueName: '',
            pollTimeout: 20,
            visibilityTimeout: 30,
            maxConcurrentMessages: 10,
            maxMessagesPerPoll: 10,
            autoStartup: true,
            acknowledgementMode: AcknowledgementMode.ON_SUCCESS,
        };
    }

    /**
     * Configure the container using a fluent API callback.
     *
     * @param callback Configuration callback that receives ContainerOptions
     */
    configure(callback: (options: ContainerOptions) => void): void {
        const options = new ContainerOptions();
        callback(options);
        const builtConfig = options.build();

        this.config = {
            ...this.config,
            ...builtConfig,
        };

        if (builtConfig.messageConverter) {
            this.converter = builtConfig.messageConverter;
        }

        // Extract and store context/resource configuration
        if ((builtConfig as any).contextResolver) {
            this.contextResolver = (builtConfig as any).contextResolver;
        }
        if ((builtConfig as any).resourceProvider) {
            this.resourceProvider = (builtConfig as any).resourceProvider;
        }
        if ((builtConfig as any).contextKeyGenerator) {
            this.contextKeyGenerator = (builtConfig as any).contextKeyGenerator;
        }
        if ((builtConfig as any).resourceCleanup) {
            this.resourceCleanup = (builtConfig as any).resourceCleanup;
        }

        // Initialize semaphore with configured concurrency
        this.semaphore = new Semaphore(this.config.maxConcurrentMessages);
    }

    /**
     * Set the container ID for logging and monitoring.
     *
     * @param id Container identifier
     */
    setId(id: string): void {
        this.config.id = id;
    }

    /**
     * Set the message listener that will process messages.
     *
     * @param listener QueueListener implementation
     */
    setMessageListener(listener: QueueListener<TPayload, TContext, TResources>): void {
        this.listener = listener;
    }

    /**
     * Set a custom error handler for processing errors.
     *
     * @param handler QueueListenerErrorHandler implementation
     */
    setErrorHandler(handler: QueueListenerErrorHandler): void {
        this.errorHandler = handler;
    }

    /**
     * NestJS lifecycle hook - called when the module is initialized.
     * Starts polling if autoStartup is true.
     */
    async onModuleInit(): Promise<void> {
        if (this.config.autoStartup) {
            await this.start();
        }
    }

    /**
     * Start the container and begin polling for messages.
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            return;
        }

        if (!this.listener) {
            throw new Error('Message listener must be set before starting container');
        }

        // Initialize semaphore if not already done
        if (!this.semaphore) {
            this.semaphore = new Semaphore(this.config.maxConcurrentMessages);
        }

        // Initialize converter if not already done
        if (!this.converter) {
            this.converter = new JsonPayloadMessagingConverter<TPayload>();
        }

        // Initialize the error handler if not already done
        if (!this.errorHandler) {
            this.errorHandler = new DefaultQueueListenerErrorHandler(this.logger);
        }

        // Resolve queue URL
        await this.resolveQueueUrl();

        this.isRunning = true;
        this.abortController = new AbortController();

        this.logger.log(
            `Starting container ${this.config.id || this.listener.constructor.name} for queue ${this.config.queueName}`
        );

        // Start the polling loop (don't await - let it run in the background)
        this.pollingPromise = this.poll().catch(error => {
            this.logger.error(`Fatal error in polling loop: ${error.message}`, error.stack);
        });
    }

    /**
     * Stop the container and cease polling.
     * Waits for in-flight messages to complete and cleans up resources.
     */
    async stop(): Promise<void> {
        if (!this.isRunning) {
            this.logger.debug('Stop called but container is not running');
            return;
        }

        this.logger.debug('Stopping container...');
        this.isRunning = false;

        // Abort any in-flight SQS requests to immediately stop long-polling
        if (this.abortController) {
            this.logger.debug('Aborting in-flight SQS requests...');
            this.abortController.abort();
        }

        // Wait for the polling loop to complete (with timeout)
        if (this.pollingPromise) {
            this.logger.debug('Waiting for polling loop to complete...');
            let timeoutId: NodeJS.Timeout;
            const timeout = new Promise(resolve => {
                timeoutId = setTimeout(resolve, 2000);
            });
            await Promise.race([this.pollingPromise, timeout]);
            clearTimeout(timeoutId!);
            this.logger.debug('Polling loop completed');
        }

        // Wait for in-flight messages to complete
        const maxWait = 5000; // 5 seconds max
        const startTime = Date.now();
        this.logger.debug(`Waiting for ${this.inFlightMessages} in-flight messages...`);
        while (this.inFlightMessages > 0 && (Date.now() - startTime) < maxWait) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        this.logger.debug(`In-flight messages: ${this.inFlightMessages}`);

        // Clean up cached resources before final shutdown
        await this.cleanupResources();

        this.logger.log(`Stopped container ${this.config.id || 'unnamed'}`);
    }

    /**
     * NestJS lifecycle hook - called when the module is being destroyed.
     * Stops the container gracefully.
     */
    async onModuleDestroy(): Promise<void> {
        await this.stop();
    }

    /**
     * Resolve queue name to full queue URL.
     * Caches the resolved URL for subsequent calls.
     */
    private async resolveQueueUrl(): Promise<void> {
        if (this.resolvedQueueUrl) {
            return;
        }

        const queueName = this.config.queueName;

        // Check if it's already a URL
        if (queueName.startsWith('https://') || queueName.startsWith('http://')) {
            this.resolvedQueueUrl = queueName;
            this.config.queueUrl = queueName;
            return;
        }

        // Resolve queue name to URL
        const command = new GetQueueUrlCommand({
            QueueName: queueName,
        });

        const response = await this.sqsClient.send(command);

        if (!response.QueueUrl) {
            throw new Error(`Failed to resolve queue URL for queue: ${queueName}`);
        }

        this.resolvedQueueUrl = response.QueueUrl;
        this.config.queueUrl = response.QueueUrl;
    }

    /**
     * Main polling loop - continuously receives and processes messages.
     */
    private async poll(): Promise<void> {
        while (this.isRunning) {
            try {
                const messages = await this.receiveMessages();

                // Check if we should stop before processing
                if (!this.isRunning) {
                    break;
                }

                if (messages.length > 0) {
                    this.logger.debug(`Received ${messages.length} message(s)`);

                    // Process messages in parallel (respecting concurrency limit via semaphore)
                    await Promise.all(
                        messages.map(message => this.processMessage(message))
                    );
                }
            } catch (error) {
                // Check if this is an abort error (expected during shutdown)
                if (error instanceof Error && error.name === 'AbortError') {
                    this.logger.debug('Polling aborted during shutdown');
                    break;
                }

                // Check if we should stop before handling error
                if (!this.isRunning) {
                    break;
                }

                const errorMessage = error instanceof Error ? error.message : String(error);
                const errorStack = error instanceof Error ? error.stack : undefined;
                this.logger.error(`Error polling queue: ${errorMessage}`, errorStack);

                // Back off on error (but check isRunning periodically)
                for (let i = 0; i < 50 && this.isRunning; i++) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
            }
        }
    }

    /**
     * Receive messages from SQS queue.
     */
    private async receiveMessages(): Promise<SQSMessage[]> {
        const command = new ReceiveMessageCommand({
            QueueUrl: this.resolvedQueueUrl!,
            MaxNumberOfMessages: this.config.maxMessagesPerPoll,
            WaitTimeSeconds: this.config.pollTimeout,
            MessageAttributeNames: ['All'],
            MessageSystemAttributeNames: ['All'],
            VisibilityTimeout: this.config.visibilityTimeout,
        });

        // Use abort signal to cancel long-polling requests during shutdown
        const options = this.abortController ? { abortSignal: this.abortController.signal } : {};

        const response = await this.sqsClient.send(command, options);
        return response.Messages || [];
    }

    /**
     * Process a single message.
     * Orchestrates context resolution, resource provisioning, and message processing.
     */
    private async processMessage(message: SQSMessage): Promise<void> {
        // Acquire semaphore permit
        await this.semaphore!.acquire();
        this.inFlightMessages++;

        try {
            // Extract message attributes
            const attributes = this.extractMessageAttributes(message);
            
            // Resolve context (if configured)
            const context = await this.resolveContext(message, attributes);
            
            // Return early if context resolution failed
            if (context === undefined && this.contextResolver) {
                return; // Error already handled by handleContextResolutionError
            }
            
            // Provide resources (if configured)
            const resources = await this.provideResources(message, context);
            
            // Return early if resource provisioning failed (when provider is configured)
            if (resources === undefined && this.resourceProvider && context !== undefined) {
                return; // Error already handled by handleResourceProvisioningError
            }
            
            // Create message context with resolved context and resources
            const messageContext = this.createMessageContext(message, context, resources);
            
            // Process message with context
            await this.processMessageWithContext(message, messageContext);
            
        } finally {
            // Release semaphore permit
            this.semaphore!.release();
            this.inFlightMessages--;
        }
    }

    /**
     * Process message with fully resolved context.
     * Handles payload conversion, listener invocation, and error handling.
     */
    private async processMessageWithContext(
        message: SQSMessage,
        messageContext: MessageContext<TContext, TResources>
    ): Promise<void> {
        try {
            // Convert payload
            const payload = await this.convertPayload(message, messageContext);
            
            // Invoke listener
            await this.listener!.onMessage(payload, messageContext);
            
            // Handle acknowledgement on success
            await this.handleAcknowledgement(messageContext, true);
            
            // Log successful processing
            this.logger.debug(`Successfully processed message ${message.MessageId}`);
        } catch (error) {
            // Handle message processing error
            await this.handleMessageProcessingError(message, messageContext, error);
        }
    }

    /**
     * Convert message payload using the configured converter.
     */
    private async convertPayload(
        message: SQSMessage,
        messageContext: MessageContext<TContext, TResources>
    ): Promise<TPayload> {
        const attributes = this.extractMessageAttributes(message);
        return await this.converter!.convert(
            message.Body!,
            attributes,
            messageContext as MessageContext
        );
    }

    /**
     * Handle message processing errors.
     * Checks for ValidationHandledError, converts payload for error handler,
     * invokes error handler, and handles acknowledgement.
     */
    private async handleMessageProcessingError(
        message: SQSMessage,
        messageContext: MessageContext<TContext, TResources>,
        error: unknown
    ): Promise<void> {
        // Check if this is a validation error that was already handled
        if (error instanceof ValidationHandledError) {
            this.logger.debug(
                `Validation handled for message ${message.MessageId}, skipping listener invocation`
            );
            return;
        }

        // Convert error to Error instance
        const actualError = error instanceof Error ? error : new Error(String(error));
        
        // Try to convert payload for error handler (use message body on failure)
        let payload: any;
        try {
            payload = await this.convertPayload(message, messageContext);
        } catch {
            payload = message.Body;
        }

        // Invoke error handler
        await this.errorHandler!.handleError(actualError, payload, messageContext as MessageContext);
        
        // Handle acknowledgement based on mode
        await this.handleAcknowledgement(messageContext, false);

        // Log error
        this.logger.error(
            `Error processing message ${message.MessageId}: ${actualError.message}`,
            actualError.stack
        );
    }

    /**
     * Handle message acknowledgement based on the configured mode.
     */
    private async handleAcknowledgement(
        context: MessageContext<TContext, TResources>,
        success: boolean
    ): Promise<void> {
        const mode = this.config.acknowledgementMode;

        if (mode === AcknowledgementMode.ON_SUCCESS && success) {
            await context.acknowledge();
        } else if (mode === AcknowledgementMode.ALWAYS) {
            await context.acknowledge();
        }
        // MANUAL mode: never auto-acknowledge
    }

    /**
     * Extract message attributes from SQS message.
     * Returns empty object if attributes are undefined or null.
     */
    private extractMessageAttributes(message: SQSMessage): Record<string, any> {
        return message.MessageAttributes || {};
    }

    /**
     * Resolve context from message attributes using the configured context resolver.
     * Returns undefined if contextResolver is not configured or if resolution fails.
     */
    private async resolveContext(
        message: SQSMessage,
        attributes: Record<string, any>
    ): Promise<TContext | undefined> {
        if (!this.contextResolver) {
            return undefined;
        }

        try {
            return this.contextResolver(attributes);
        } catch (error) {
            await this.handleContextResolutionError(message, attributes, error);
            return undefined;
        }
    }

    /**
     * Handle context resolution errors.
     * Logs the error, creates a partial message context, invokes the error handler,
     * and handles acknowledgement based on the configured mode.
     */
    private async handleContextResolutionError(
        message: SQSMessage,
        attributes: Record<string, any>,
        error: unknown
    ): Promise<void> {
        this.logger.error(
            `Context resolution failed for message ${message.MessageId}`,
            { attributes, error }
        );

        const partialContext = this.createPartialMessageContext(message);
        const actualError = error instanceof Error ? error : new Error(String(error));
        
        await this.errorHandler!.handleError(actualError, message.Body, partialContext as MessageContext);
        await this.handleAcknowledgement(partialContext, false);
    }

    /**
     * Create a message context with resolved context and resources.
     * Used when both context resolution and resource provisioning succeed.
     */
    private createMessageContext(
        message: SQSMessage,
        context: TContext | undefined,
        resources: TResources | undefined
    ): MessageContext<TContext, TResources> {
        return new MessageContextImpl<TContext, TResources>(
            message,
            this.resolvedQueueUrl!,
            this.sqsClient,
            this.logger,
            context,
            resources
        );
    }

    /**
     * Create a partial message context without context or resources.
     * Used when context resolution or resource provisioning fails.
     */
    private createPartialMessageContext(message: SQSMessage): MessageContext<TContext, TResources> {
        return new MessageContextImpl<TContext, TResources>(
            message,
            this.resolvedQueueUrl!,
            this.sqsClient,
            this.logger,
            undefined,
            undefined
        );
    }

    /**
     * Provide resources based on resolved context using the configured resource provider.
     * Returns undefined if resourceProvider is not configured, context is undefined, or if provisioning fails.
     */
    private async provideResources(
        message: SQSMessage,
        context: TContext | undefined
    ): Promise<TResources | undefined> {
        if (!this.resourceProvider || !context) {
            return undefined;
        }

        try {
            return await this.getOrCreateResources(context);
        } catch (error) {
            await this.handleResourceProvisioningError(message, context, error);
            return undefined;
        }
    }

    /**
     * Get resources from cache or create new ones using the resource provider.
     * Uses caching to avoid redundant resource initialization for the same context.
     */
    private async getOrCreateResources(context: TContext): Promise<TResources> {
        const cacheKey = this.generateCacheKey(context);
        
        let resources = this.resourceCache.get(cacheKey);
        
        if (resources) {
            this.logger.debug(`Resources retrieved from cache for key: ${cacheKey}`);
            return resources;
        }
        
        this.logger.debug(`Cache miss for key: ${cacheKey}, creating new resources`);
        resources = await this.resourceProvider!(context);
        this.resourceCache.set(cacheKey, resources);
        this.logger.debug(`Resources created and cached for key: ${cacheKey}`);
        
        return resources;
    }

    /**
     * Generate a cache key from the context object.
     * Uses custom contextKeyGenerator if configured, otherwise uses JSON.stringify.
     */
    private generateCacheKey(context: TContext): string {
        if (this.contextKeyGenerator) {
            return this.contextKeyGenerator(context);
        }
        return JSON.stringify(context);
    }

    /**
     * Handle resource provisioning errors.
     * Logs the error, creates a message context with context but no resources,
     * invokes the error handler, and handles acknowledgement based on the configured mode.
     */
    private async handleResourceProvisioningError(
        message: SQSMessage,
        context: TContext,
        error: unknown
    ): Promise<void> {
        this.logger.error(
            `Resource provisioning failed for message ${message.MessageId}`,
            { context, error }
        );

        const contextWithoutResources = this.createMessageContextWithoutResources(message, context);
        const actualError = error instanceof Error ? error : new Error(String(error));
        
        await this.errorHandler!.handleError(actualError, message.Body, contextWithoutResources as MessageContext);
        await this.handleAcknowledgement(contextWithoutResources, false);
    }

    /**
     * Create a message context with context but no resources.
     * Used when resource provisioning fails but context was successfully resolved.
     */
    private createMessageContextWithoutResources(
        message: SQSMessage,
        context: TContext
    ): MessageContext<TContext, TResources> {
        return new MessageContextImpl<TContext, TResources>(
            message,
            this.resolvedQueueUrl!,
            this.sqsClient,
            this.logger,
            context,
            undefined
        );
    }

    /**
     * Clean up all cached resources during shutdown.
     * Calls the configured resourceCleanup function for each cached resource.
     * Logs errors but does not throw to ensure graceful shutdown.
     */
    private async cleanupResources(): Promise<void> {
        // Check if resourceCleanup is configured and cache is not empty
        if (!this.resourceCleanup || this.resourceCache.size === 0) {
            return;
        }

        // Log cleanup start with cache size
        this.logger.log(`Cleaning up ${this.resourceCache.size} cached resources`);

        // Create array of cleanup promises for all cached resources
        const cleanupPromises = Array.from(this.resourceCache.values()).map(
            async (resources) => {
                try {
                    await this.resourceCleanup!(resources);
                } catch (error) {
                    // Catch and log errors for individual cleanup failures
                    this.logger.error('Resource cleanup failed', error);
                }
            }
        );

        // Await all cleanup promises
        await Promise.all(cleanupPromises);

        // Clear resource cache
        this.resourceCache.clear();

        // Log cleanup completion
        this.logger.log('Resource cleanup completed');
    }
}
