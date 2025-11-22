import {Logger, Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
// BACKWARD COMPATIBILITY: The @snow-tzu/nest-sqs-listener package now uses the NestJS adapter
// which wraps the framework-agnostic core package. The API remains 100% compatible.
// SqsMessageListenerContainer is an alias for NestJSSqsMessageListenerContainer.
// No code changes are required when upgrading from 0.0.4 to 0.0.5+
import {AcknowledgementMode, SqsMessageListenerContainer, ValidationFailureMode,} from '@snow-tzu/nest-sqs-listener';
import {OrderService} from '../services/order.service';
import {OrderCreatedListener} from '../listeners/order-created.listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {ORDER_CONTAINER, SQS_CLIENT} from '../tokens';

@Module({
    providers: [
        OrderService,
        OrderCreatedListener,
        {
            provide: ORDER_CONTAINER,
            useFactory: (
                listener: OrderCreatedListener,
                sqsClient: SQSClient,
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
                        // Enable batch acknowledgements for better performance
                        .enableBatchAcknowledgement(true)
                        .batchAcknowledgementOptions(10, 100)
                        // Enable validation with class-validator decorators
                        .targetClass(OrderCreatedEvent)
                        .enableValidation(true)
                        .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
                        .validatorOptions({
                            whitelist: true, // Strip properties without decorators
                            forbidNonWhitelisted: false, // Allow extra properties (just strip them)
                        });
                });

                container.setId('orderCreatedListener');
                container.setMessageListener(listener);

                logger.log('Order Created Container configured successfully');
                return container;
            },
            inject: [OrderCreatedListener, SQS_CLIENT],
        },
    ],
    exports: [ORDER_CONTAINER],
})
export class OrderModule {
}
