import {Injectable, Logger} from '@nestjs/common';
import {MessageContext, QueueListener} from '@snow-tzu/nest-sqs-listener';
import {OrderCreatedEvent} from '../events/order-created.event';
import {OrderBatchService} from '../services/order-batch.service';

/**
 * Order batch listener that processes order created events.
 *
 * This listener demonstrates batch acknowledgement functionality:
 * - Each successfully processed message is queued for batch acknowledgement
 * - Messages are automatically acknowledged in batches of up to 10
 * - Partial batches are flushed after 100ms timeout
 * - All pending batches are flushed on graceful shutdown
 */
@Injectable()
export class OrderBatchListener implements QueueListener<OrderCreatedEvent> {
    private readonly logger = new Logger(OrderBatchListener.name);

    constructor(private readonly orderBatchService: OrderBatchService) {
    }

    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        this.logger.log(`Processing order ${message.orderId} for customer ${message.customerId}`);
        this.logger.debug(`Message ID: ${context.getMessageId()}`);
        this.logger.debug(`Receive count: ${context.getApproximateReceiveCount()}`);

        // Process the order through the service layer
        await this.orderBatchService.processOrder(message);

        this.logger.log(`Order ${message.orderId} processed successfully`);
        // Note: Message will be automatically queued for batch acknowledgement
        // since we're using AcknowledgementMode.ON_SUCCESS with batch acknowledgements enabled
    }
}