import {Logger, Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
// BACKWARD COMPATIBILITY: The @snow-tzu/nest-sqs-listener package now uses the NestJS adapter
// which wraps the framework-agnostic core package. The API remains 100% compatible.
// SqsMessageListenerContainer is an alias for NestJSSqsMessageListenerContainer.
// No code changes are required when upgrading from 0.0.4 to 0.0.5+
//
// OPTIONAL IMPROVEMENT: You can explicitly use NestJSSqsMessageListenerContainer:
// import { NestJSSqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
import {AcknowledgementMode, SqsMessageListenerContainer, ValidationFailureMode} from '@snow-tzu/nest-sqs-listener';
import {OrderService} from '../services/order.service';
import {OrderCreatedListener} from '../listeners/order-created.listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {CustomErrorHandler} from '../error-handlers/custom-error.handler';
import {TracingListener} from '../listeners/tracing.listener';
import {ORDER_CONTAINER, ORDER_SQS_CLIENT} from '../tokens';

@Module({
    providers: [
        OrderService,
        OrderCreatedListener,
        CustomErrorHandler,
        {
            provide: ORDER_CONTAINER,
            useFactory: (
                listener: OrderCreatedListener,
                sqsClient: SQSClient,
                errorHandler: CustomErrorHandler,
            ) => {
                const logger = new Logger('OrderCreatedContainer');
                logger.log('Creating Order Created Container');

                const container = new SqsMessageListenerContainer<OrderCreatedEvent>(sqsClient, logger);

                container.configure(options => {
                    options
                        .queueName(process.env.ORDER_QUEUE_NAME || 'order-events')
                        .pollTimeout(20)
                        .autoStartup(true)
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                        .maxConcurrentMessages(5)
                        .visibilityTimeout(30)
                        .maxMessagesPerPoll(10)
                        // Enable batch acknowledgements for high-volume processing
                        .enableBatchAcknowledgement(true)
                        .batchAcknowledgementOptions(10, 100)
                        // Enable validation with THROW mode - validation errors invoke error handler
                        .targetClass(OrderCreatedEvent)
                        .enableValidation(true)
                        .validationFailureMode(ValidationFailureMode.THROW)
                        .validatorOptions({
                            whitelist: true,
                            forbidNonWhitelisted: true, // Reject messages with unexpected properties
                        });
                });

                container.setId('orderCreatedListener');
                container.setErrorHandler(errorHandler);
                container.setMessageListener(new TracingListener(listener));

                logger.log('Order Created Container configured successfully');
                return container;
            },
            inject: [OrderCreatedListener, ORDER_SQS_CLIENT, CustomErrorHandler],
        },
    ],
    exports: [ORDER_CONTAINER],
})
export class OrderModule {
}
