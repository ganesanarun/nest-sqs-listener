import { Logger, Module } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  AcknowledgementMode,
  SqsMessageListenerContainer,
} from '@snow-tzu/nest-sqs-listener';
import { OrderService } from '../services/order.service';
import { OrderCreatedListener } from '../listeners/order-created.listener';
import { OrderCreatedEvent } from '../events/order-created.event';
import { SQS_CLIENT, ORDER_CONTAINER } from '../tokens';

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
        container.setMessageListener(listener);

        logger.log('Order Created Container configured successfully');
        return container;
      },
      inject: [OrderCreatedListener, SQS_CLIENT],
    },
  ],
  exports: [ORDER_CONTAINER],
})
export class OrderModule {}
