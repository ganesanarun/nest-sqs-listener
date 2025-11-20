import {MessageContext, QueueListener} from '@snow-tzu/sqs-listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {OrderService} from '../services/order.service';

/**
 * Order Created Listener
 *
 * Handles order creation messages from SQS.
 * Demonstrates the QueueListener interface implementation
 * and separation of concerns with business logic in services.
 */
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
    constructor(
        private readonly orderService: OrderService,
        private readonly logger: any
    ) {
    }

    /**
     * Handle incoming order created messages
     */
    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        this.logger.info(`Processing order created event - orderId: ${message.orderId}, customerId: ${message.customerId}, amount: ${message.amount}, items: ${message.items.length}, messageId: ${context.getMessageId()}`, {
            orderId: message.orderId,
            customerId: message.customerId,
            amount: message.amount,
            itemCount: message.items.length,
            messageId: context.getMessageId()
        });

        try {
            // Process the order through the service layer
            await this.orderService.processOrder(message);

            this.logger.info(`Order processed successfully - orderId: ${message.orderId}, messageId: ${context.getMessageId()}`, {
                orderId: message.orderId,
                messageId: context.getMessageId()
            });
        } catch (err) {
            const error = err as Error;
            this.logger.error('Failed to process order', {
                orderId: message.orderId,
                messageId: context.getMessageId(),
                error: error.message
            });

            // Re-throw to let the SQS listener handle retry logic
            throw error;
        }
    }
}