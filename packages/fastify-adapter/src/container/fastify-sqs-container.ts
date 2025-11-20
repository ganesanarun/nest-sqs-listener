import {LoggerInterface, SqsMessageListenerContainer} from '@snow-tzu/sqs-listener';
import {SQSClient} from '@aws-sdk/client-sqs';
import {FastifyInstance} from 'fastify';
import {FastifyLoggerAdapter} from '../logger';

/**
 * Fastify-specific extension of SqsMessageListenerContainer that integrates
 * with Fastify's lifecycle hooks and error handling system.
 *
 * This container automatically starts during Fastify's ready phase and stops
 * during Fastify's close phase when autoStartup is enabled. It also integrates
 * with Fastify's error handling system for consistent error reporting.
 *
 * @example
 * ```typescript
 * const container = new FastifySqsContainer(sqsClient, fastify);
 *
 * container.configure(options => {
 *   options
 *     .queueNameOrUrl('order-queue')
 *     .autoStartup(true);
 * });
 *
 * container.setMessageListener(orderListener);
 *
 * // Container will start automatically when Fastify is ready
 * // and stop when Fastify closes
 * ```
 */
export class FastifySqsContainer<T> extends SqsMessageListenerContainer<T> {
    private readonly fastify: FastifyInstance;
    private lifecycleHooksRegistered = false;

    constructor(
        sqsClient: SQSClient,
        fastify: FastifyInstance,
        logger?: LoggerInterface
    ) {
        // Use FastifyLoggerAdapter if no custom logger provided
        const effectiveLogger = logger || new FastifyLoggerAdapter(fastify.log);
        super(sqsClient, effectiveLogger);

        this.fastify = fastify;
    }

    /**
     * Register Fastify lifecycle hooks for automatic startup and shutdown.
     * This method is called automatically by the plugin when autoStartup is enabled.
     */
    registerLifecycleHooks(): void {
        if (this.lifecycleHooksRegistered) {
            return;
        }

        // Register onReady hook for automatic startup
        this.fastify.addHook('onReady', async () => {
            if (this.isAutoStartupEnabled() && !this.isContainerRunning()) {
                try {
                    this.fastify.log.debug('Starting SQS listener container as part of Fastify ready phase');
                    await this.start();
                } catch (error) {
                    // Create contextual error message and log
                    const contextualMessage = this.createContextualErrorMessage('startup');
                    this.fastify.log.error(error, contextualMessage);

                    // Re-throw to prevent Fastify from starting if SQS listener fails
                    throw error;
                }
            }
        });

        // Register onClose hook for automatic shutdown
        this.fastify.addHook('onClose', async () => {
            if (this.isContainerRunning()) {
                try {
                    this.fastify.log.debug('Stopping SQS listener container as part of Fastify close phase');
                    await this.stop();
                    
                    // Give a small delay to ensure all async operations complete
                    await new Promise(resolve => setTimeout(resolve, 100));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    const errorStack = error instanceof Error ? error.stack : undefined;

                    // Log error but don't throw during shutdown
                    this.fastify.log.error(
                        {error: errorMessage, stack: errorStack},
                        'Error stopping SQS listener container during Fastify close phase'
                    );
                }
            }
        });

        this.lifecycleHooksRegistered = true;
    }

    /**
     * Override start method to integrate with Fastify's error handling.
     */
    async start(): Promise<void> {
        try {
            await super.start();
        } catch (error) {
            // Log error and re-throw
            this.handleFastifyError(error, 'Failed to start SQS listener container');
            throw error;
        }
    }

    /**
     * Override stop method to integrate with Fastify's error handling.
     */
    async stop(): Promise<void> {
        try {
            await super.stop();
        } catch (error) {
            // Log error but don't throw during shutdown
            this.handleFastifyError(error, 'Error stopping SQS listener container');
        }
    }

    /**
     * Create a contextual error message with helpful debugging information.
     */
    private createContextualErrorMessage(operation: string): string {
        const containerId = this.getContainerId();
        const queueUrl = this.getResolvedQueueUrl();
        return `Failed to start SQS listener container '${containerId}' during ${operation} (queue: ${queueUrl}) - Check if LocalStack/AWS endpoint is running and accessible`;
    }

    /**
     * Handle errors through Fastify's error system.
     * This ensures consistent error reporting and integration with Fastify's error handling.
     */
    private handleFastifyError(error: unknown, context: string): void {
        // Simple error handling - just pass the error object directly to Fastify logger
        this.fastify.log.error(error, context);

        // Optionally emit as Fastify error event for custom error handlers
        if (error instanceof Error) {
            this.fastify.server?.emit('error', error);
        }
    }
}