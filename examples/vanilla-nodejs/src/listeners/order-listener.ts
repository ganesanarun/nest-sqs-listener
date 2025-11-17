import {MessageContext, QueueListener} from '@snow-tzu/sqs-listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {CustomLogger} from '../logger/custom-logger';

/**
 * Order listener implementation using the framework-agnostic core package.
 * This demonstrates how to handle SQS messages without any framework dependencies.
 */
export class OrderListener implements QueueListener<OrderCreatedEvent> {
    private readonly logger = new CustomLogger('OrderListener');

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
        this.logger.log(`Message ID: ${context.getMessageId()}`);

        // Simulate order processing
        await this.processOrder(payload);

        this.logger.log(`Successfully processed order: ${payload.orderId}`);
    }

    private async processOrder(order: OrderCreatedEvent): Promise<void> {
        // Simulate async processing (e.g., database operations, external API calls)
        await new Promise(resolve => setTimeout(resolve, 100));

        // Your business logic here
        this.logger.debug(`Order ${order.orderId} validated and stored`);
    }
}
