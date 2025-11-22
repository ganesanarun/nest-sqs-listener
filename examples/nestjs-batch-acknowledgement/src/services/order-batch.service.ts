import {Injectable, Logger} from '@nestjs/common';
import {OrderCreatedEvent} from '../events/order-created.event';

/**
 * Order batch service that handles the business logic for processing orders.
 *
 * This service demonstrates typical order processing that would benefit from
 * batch acknowledgements when handling high volumes of messages.
 */
@Injectable()
export class OrderBatchService {
    private readonly logger = new Logger(OrderBatchService.name);

    async processOrder(order: OrderCreatedEvent): Promise<void> {
        this.logger.log(`Processing order ${order.orderId} for customer ${order.customerId}`);
        this.logger.log(`Order amount: ${order.amount}`);
        this.logger.log(`Items: ${order.items.length}`);

        // Simulate order processing logic
        await this.validateOrder(order);
        await this.reserveInventory(order);
        await this.processPayment(order);
        await this.createShipment(order);

        this.logger.log(`Order ${order.orderId} processed successfully`);
    }

    private async validateOrder(order: OrderCreatedEvent): Promise<void> {
        // Simulate validation logic
        this.logger.debug(`Validating order ${order.orderId}`);

        if (order.amount <= 0) {
            throw new Error(`Invalid order amount: ${order.amount}`);
        }

        if (order.items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        // Simulate async validation (e.g., checking business rules)
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    private async reserveInventory(order: OrderCreatedEvent): Promise<void> {
        this.logger.debug(`Reserving inventory for order ${order.orderId}`);

        // Simulate inventory reservation
        for (const item of order.items) {
            this.logger.debug(`Reserving ${item.quantity} units of ${item.productId}`);
            // Simulate async inventory check
            await new Promise(resolve => setTimeout(resolve, 5));
        }
    }

    private async processPayment(order: OrderCreatedEvent): Promise<void> {
        this.logger.debug(`Processing payment for order ${order.orderId}`);

        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 20));

        this.logger.debug(`Payment of ${order.amount} processed for order ${order.orderId}`);
    }

    private async createShipment(order: OrderCreatedEvent): Promise<void> {
        this.logger.debug(`Creating shipment for order ${order.orderId}`);

        // Simulate shipment creation
        await new Promise(resolve => setTimeout(resolve, 15));

        this.logger.debug(`Shipment created for order ${order.orderId}`);
    }
}