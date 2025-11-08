import {Logger, Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, SqsMessageListenerContainer,} from '@snow-tzu/nestjs-sqs-listener';
import {OrderService} from '../services/order.service';
import {OrderCreatedListener} from '../listeners/order-created.listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {CustomErrorHandler} from '../error-handlers/custom-error.handler';
import {TracingListener} from '../listeners/tracing.listener';
import { ORDER_SQS_CLIENT, ORDER_CONTAINER } from '../tokens';

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

                const container = new SqsMessageListenerContainer<OrderCreatedEvent>(sqsClient);

                container.configure(options => {
                    options
                        .queueNames(process.env.ORDER_QUEUE_NAME || 'order-events')
                        .pollTimeout(20)
                        .autoStartup(true)
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                        .maxConcurrentMessages(5)
                        .visibilityTimeout(30)
                        .maxMessagesPerPoll(10);
                });

                container.setId('orderCreatedListener');

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
