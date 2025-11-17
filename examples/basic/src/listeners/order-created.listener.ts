import {Injectable, Logger} from '@nestjs/common';
// BACKWARD COMPATIBILITY: All core types (QueueListener, MessageContext, etc.) are re-exported
// from the NestJS adapter package for convenience. Your existing imports continue to work.
import {MessageContext, QueueListener} from '@snow-tzu/nest-sqs-listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {OrderService} from '../services/order.service';

@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
    private readonly logger = new Logger(OrderCreatedListener.name);

    constructor(private readonly orderService: OrderService) {
    }

    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        this.logger.log(`Received order message: ${context.getMessageId()}`);
        this.logger.log(`Receive count: ${context.getApproximateReceiveCount()}`);

        await this.orderService.processNewOrder(message);

        this.logger.log(`Order message processed successfully`);
    }
}
