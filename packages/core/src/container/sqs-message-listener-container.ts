import {GetQueueUrlCommand, ReceiveMessageCommand, SQSClient,} from '@aws-sdk/client-sqs';
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
import {LoggerInterface} from '../logger/logger.interface';
import {ConsoleLogger} from '../logger/console-logger';

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
 * @example
 * ```typescript
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
 * ```
 */
export class SqsMessageListenerContainer<T> {
    private config: ContainerConfiguration & { messageConverter?: PayloadMessagingConverter<T> };
    private listener?: QueueListener<T>;
    private errorHandler?: QueueListenerErrorHandler;
    private converter?: PayloadMessagingConverter<T>;
    private semaphore?: Semaphore;
    private isRunning = false;
    private resolvedQueueUrl?: string;
    private inFlightMessages = 0;
    private readonly logger: LoggerInterface;
    private pollingPromise?: Promise<void>;
    private abortController?: AbortController;

    constructor(
        private readonly sqsClient: SQSClient,
        logger?: LoggerInterface
    ) {
        this.logger = logger || new ConsoleLogger('SqsMessageListenerContainer');

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
            pollingErrorBackoff: 5,
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
    setMessageListener(listener: QueueListener<T>): void {
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
     * Check if auto-startup is enabled.
     * Used by framework adapters to determine if start() should be called automatically.
     *
     * @returns true if auto-startup is enabled, false otherwise
     */
    isAutoStartupEnabled(): boolean {
        return this.config.autoStartup;
    }

    /**
     * Check if the container is currently running.
     *
     * @returns true if the container is running, false otherwise
     */
    isContainerRunning(): boolean {
        return this.isRunning;
    }

    /**
     * Get the container ID for error reporting and logging.
     * Protected method for use by subclasses.
     */
    protected getContainerId(): string {
        return this.config.id || 'unnamed';
    }

    /**
     * Get the resolved queue URL for error reporting and logging.
     * Protected method for use by subclasses.
     */
    protected getResolvedQueueUrl(): string {
        return this.resolvedQueueUrl || this.config.queueName || 'unknown';
    }



    /**
     * Start the container and begin polling for messages.
     */
    async start(): Promise<void> {
        if (this.isRunning) {
            this.logger.debug(`Container ${this.config.id || 'unnamed'} is already running`);
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
            this.converter = new JsonPayloadMessagingConverter<T>();
        }

        // Initialize the error handler if not already done
        if (!this.errorHandler) {
            this.errorHandler = new DefaultQueueListenerErrorHandler(this.logger);
        }

        // Resolve queue URL
        await this.resolveQueueUrl();

        this.logger.log(
            `Starting SQS listener container: ${this.config.id || this.listener.constructor.name} for queue: ${this.config.queueName}`
        );

        this.isRunning = true;
        this.abortController = new AbortController();

        // Start the polling loop (don't await - let it run in the background)
        this.pollingPromise = this.poll().catch(error => {
            this.logger.error(`Fatal error in polling loop: ${error.message}`, error.stack);
        });

        this.logger.log(`SQS listener container started: ${this.config.id || this.listener.constructor.name}`);
    }

    /**
     * Stop the container and cease polling.
     * Waits for in-flight messages to complete.
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

        this.logger.log(`Stopped container ${this.config.id || 'unnamed'}`);
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

                // Back off on error using configured pollingErrorBackoff (convert seconds to milliseconds)
                const backoffMs = this.config.pollingErrorBackoff * 1000;
                await new Promise(resolve => setTimeout(resolve, backoffMs));
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
     */
    private async processMessage(message: SQSMessage): Promise<void> {
        // Track in-flight message before any processing
        this.inFlightMessages++;

        try {
            // Acquire semaphore permit for concurrency control
            await this.semaphore!.acquire();

            try {
                // Create message context before calling converter
                // This allows converters to acknowledge messages directly when needed
                const context = new MessageContextImpl(
                    message,
                    this.resolvedQueueUrl!,
                    this.sqsClient,
                    this.logger
                );

                // Convert message body to typed payload, passing context for validation scenarios
                const payload = await this.converter!.convert(
                    message.Body!,
                    message.MessageAttributes || {},
                    context
                );

                // Invoke listener
                await this.listener!.onMessage(payload, context);

                // Handle acknowledgement based on mode
                await this.handleAcknowledgement(context, true);

                this.logger.debug(`Successfully processed message ${message.MessageId}`);
            } catch (error) {
                // Check if this is a validation error that was already handled
                // In ACKNOWLEDGE mode: a message was already acknowledged by converter
                // In REJECT mode: a message was not acknowledged and will retry
                // In both cases: skip listener invocation and error handler
                if (error instanceof ValidationHandledError) {
                    this.logger.debug(
                        `Validation handled for message ${message.MessageId}, skipping listener invocation`
                    );
                    // Don't invoke the error handler, don't modify acknowledgement state
                    // The converter already handled logging and acknowledgement as needed
                    return;
                }

                // Create context for error handler
                const context = new MessageContextImpl(
                    message,
                    this.resolvedQueueUrl!,
                    this.sqsClient,
                    this.logger
                );

                // Try to convert payload for the error handler (may fail)
                let payload: any;
                try {
                    payload = await this.converter!.convert(
                        message.Body!,
                        message.MessageAttributes || {},
                        context
                    );
                } catch {
                    payload = message.Body;
                }

                // Invoke error handler
                const actualError = error instanceof Error ? error : new Error(String(error));
                await this.errorHandler!.handleError(actualError, payload, context);

                // Handle acknowledgement based on mode (failure case)
                await this.handleAcknowledgement(context, false);

                const errorMessage = actualError.message;
                const errorStack = actualError.stack;
                this.logger.error(
                    `Error processing message ${message.MessageId}: ${errorMessage}`,
                    errorStack
                );
            } finally {
                // Always release semaphore permit
                this.semaphore!.release();
            }
        } finally {
            // Always decrement in-flight counter, even if semaphore operations fail
            this.inFlightMessages--;
        }
    }

    /**
     * Handle message acknowledgement based on the configured mode.
     */
    private async handleAcknowledgement(
        context: MessageContext,
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
}
