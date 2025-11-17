import {Injectable, Logger, OnModuleDestroy, OnModuleInit} from '@nestjs/common';
import {SqsMessageListenerContainer} from '@snow-tzu/sqs-listener';
import {SQSClient} from '@aws-sdk/client-sqs';
import {NestJSLoggerAdapter} from '../logger/nestjs-logger-adapter';

/**
 * NestJS-specific wrapper for SqsMessageListenerContainer.
 *
 * This class integrates the framework-agnostic core container with NestJS's
 * lifecycle hooks and dependency injection system. It automatically starts
 * and stops the container based on the NestJS module lifecycle.
 *
 * Features:
 * - Implements OnModuleInit to start container when module initializes
 * - Implements OnModuleDestroy to stop container during graceful shutdown
 * - Uses @Injectable decorator for NestJS dependency injection
 * - Wraps NestJS Logger with LoggerInterface adapter
 *
 * @example
 * ```typescript
 * @Module({
 *   providers: [
 *     {
 *       provide: 'ORDER_LISTENER_CONTAINER',
 *       useFactory: (sqsClient: SQSClient, logger: Logger) => {
 *         const container = new NestJSSqsMessageListenerContainer<OrderEvent>(
 *           sqsClient,
 *           logger
 *         );
 *         container.configure(options => {
 *           options
 *             .queueName('order-queue')
 *             .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
 *         });
 *         container.setMessageListener(orderListener);
 *         return container;
 *       },
 *       inject: [SQS_CLIENT, Logger],
 *     },
 *   ],
 * })
 * export class OrderModule {}
 * ```
 */
@Injectable()
export class NestJSSqsMessageListenerContainer<T>
    extends SqsMessageListenerContainer<T>
    implements OnModuleInit, OnModuleDestroy {
    /**
     * Creates a new NestJS-integrated SQS message listener container.
     *
     * @param sqsClient - AWS SQS client instance
     * @param logger - Optional NestJS Logger instance (creates default if not provided)
     */
    constructor(sqsClient: SQSClient, logger?: Logger) {
        // Create logger adapter - use the provided logger or create default
        const loggerAdapter = logger
            ? new NestJSLoggerAdapter(logger)
            : new NestJSLoggerAdapter(new Logger(NestJSSqsMessageListenerContainer.name));

        // Call parent constructor with SQS client and logger adapter
        super(sqsClient, loggerAdapter);
    }

    /**
     * NestJS lifecycle hook - called when the module is initialized.
     *
     * Automatically starts the container if autoStartup is enabled in configuration.
     * This allows the container to begin polling for messages as soon as the
     * NestJS application is ready.
     */
    async onModuleInit(): Promise<void> {
        if (this.isAutoStartupEnabled()) {
            await this.start();
        }
    }

    /**
     * NestJS lifecycle hook - called when the module is being destroyed.
     *
     * Ensures graceful shutdown by stopping the container and waiting for
     * in-flight messages to complete processing before the application exits.
     */
    async onModuleDestroy(): Promise<void> {
        await this.stop();
    }
}
