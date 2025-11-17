import {ConsoleLogger, MessageContext, QueueListener} from '@snow-tzu/sqs-listener';
import {OrderCreatedEvent} from '../events/order-created.event';

export class OrderListener implements QueueListener<OrderCreatedEvent> {
    private readonly logger = new ConsoleLogger('OrderListener');

    async onMessage(
        payload: OrderCreatedEvent,
        context: MessageContext
    ): Promise<void> {
        this.logger.log(
            `Processing order: ${payload.orderId} for customer: ${payload.customerId}`
        );
        this.logger.log(
            `Order amount: ${payload.amount} ${payload.currency}`
        );

        // Simulate order processing
        await this.processOrder(payload);

        this.logger.log(`Successfully processed order: ${payload.orderId}`);
    }

    private async processOrder(order: OrderCreatedEvent): Promise<void> {
        // Simulate async processing
        await new Promise(resolve => setTimeout(resolve, 100));
        this.logger.debug(`Order ${order.orderId} validated and stored`);
    }
}
