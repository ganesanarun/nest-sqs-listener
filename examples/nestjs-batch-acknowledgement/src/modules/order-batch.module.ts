import {Logger, Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, SqsMessageListenerContainer, ValidationFailureMode} from '@snow-tzu/nest-sqs-listener';
import {OrderBatchService} from '../services/order-batch.service';
import {OrderBatchListener} from '../listeners/order-batch.listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {AwsModule, SQS_CLIENT} from './aws.module';

export const ORDER_BATCH_CONTAINER = Symbol('ORDER_BATCH_CONTAINER');

/**
 * Order batch module that configures the SQS listener container with batch acknowledgements.
 *
 * This module demonstrates:
 * - Basic batch acknowledgement configuration
 * - Default batch settings (maxSize=10, flushInterval=100ms)
 * - Automatic message validation
 * - Cost-effective message processing
 */
@Module({
    imports: [AwsModule],
    providers: [
        OrderBatchService,
        OrderBatchListener,
        {
            provide: ORDER_BATCH_CONTAINER,
            useFactory: (
                listener: OrderBatchListener,
                sqsClient: SQSClient,
            ) => {
                const logger = new Logger('OrderBatchContainer');
                logger.log('Creating Order Batch Container');

                const container = new SqsMessageListenerContainer<OrderCreatedEvent>(sqsClient, logger);

                container.configure(options => {
                    options
                        .queueName(process.env.ORDER_QUEUE_NAME || 'order-events-batch')
                        .pollTimeout(20)
                        .autoStartup(true)
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                        .maxConcurrentMessages(5)
                        .visibilityTimeout(30)
                        .maxMessagesPerPoll(10)
                        // Enable batch acknowledgements with default settings
                        // This reduces SQS API calls by up to 90%
                        .enableBatchAcknowledgement(true)
                        // Optional: customize batch settings (uncomment to override defaults)
                        // .batchAcknowledgementOptions(10, 100) // maxSize=10, flushInterval=100ms
                        // Enable validation with class-validator decorators
                        .targetClass(OrderCreatedEvent)
                        .enableValidation(true)
                        .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
                        .validatorOptions({
                            whitelist: true, // Strip properties without decorators
                            forbidNonWhitelisted: false, // Allow extra properties (just strip them)
                        });
                });

                container.setId('orderBatchListener');
                container.setMessageListener(listener);

                logger.log('Batch acknowledgements enabled: maxSize=10, flushInterval=100ms');
                logger.log('Expected API call reduction: ~90% for high-volume processing');
                logger.log('Order Batch Container configured successfully');
                return container;
            },
            inject: [OrderBatchListener, SQS_CLIENT],
        },
    ],
    exports: [ORDER_BATCH_CONTAINER],
})
export class OrderBatchModule {
}