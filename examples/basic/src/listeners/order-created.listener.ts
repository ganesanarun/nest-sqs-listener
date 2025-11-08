import { Injectable, Logger } from '@nestjs/common';
import { MessageContext, QueueListener } from '@snow-tzu/nestjs-sqs-listener';
import { OrderCreatedEvent } from '../events/order-created.event';
import { OrderService } from '../services/order.service';

@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
  private readonly logger = new Logger(OrderCreatedListener.name);

  constructor(private readonly orderService: OrderService) {}

  async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
    this.logger.log(`Received order message: ${context.getMessageId()}`);
    this.logger.log(`Receive count: ${context.getApproximateReceiveCount()}`);

    await this.orderService.processNewOrder(message);

    this.logger.log(`Order message processed successfully`);
  }
}
