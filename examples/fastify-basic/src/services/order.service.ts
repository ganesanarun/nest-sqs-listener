import {OrderCreatedEvent} from '../events/order-created.event';

/**
 * Order Service
 *
 * Contains business logic for processing orders.
 * This demonstrates separation of concerns - keeping business logic
 * separate from message handling infrastructure.
 */
export class OrderService {
    constructor(private readonly logger: any) {
    }

    /**
     * Process an order creation event
     */
    async processOrder(order: OrderCreatedEvent): Promise<void> {
        this.logger.debug('Starting order processing', {orderId: order.orderId});

        // Simulate order processing steps
        await this.validateOrder(order);
        await this.calculateTotals(order);
        await this.reserveInventory(order);
        await this.createOrderRecord(order);

        this.logger.debug('Order processing completed', {orderId: order.orderId});
    }

    /**
     * Validate order data
     */
    private async validateOrder(order: OrderCreatedEvent): Promise<void> {
        // Simulate validation logic
        if (order.items.length === 0) {
            throw new Error('Order must contain at least one item');
        }

        // Simulate async validation (e.g., customer exists)
        await new Promise(resolve => setTimeout(resolve, 50));

        this.logger.debug('Order validation completed', {orderId: order.orderId});
    }

    /**
     * Calculate order totals
     */
    private async calculateTotals(order: OrderCreatedEvent): Promise<void> {
        const calculatedTotal = order.items.reduce((total, item) => {
            return total + (item.price * item.quantity);
        }, 0);

        // In a real application, you might update the order with calculated values
        this.logger.debug('Order totals calculated', {
            orderId: order.orderId,
            providedAmount: order.amount,
            calculatedTotal
        });

        // Simulate async calculation
        await new Promise(resolve => setTimeout(resolve, 30));
    }

    /**
     * Reserve inventory for order items
     */
    private async reserveInventory(order: OrderCreatedEvent): Promise<void> {
        // Simulate inventory reservation
        for (const item of order.items) {
            // Simulate async inventory check/reservation
            await new Promise(resolve => setTimeout(resolve, 20));

            this.logger.debug('Inventory reserved', {
                orderId: order.orderId,
                productId: item.productId,
                quantity: item.quantity
            });
        }
    }

    /**
     * Create order record in database
     */
    private async createOrderRecord(order: OrderCreatedEvent): Promise<void> {
        // Simulate database operation
        await new Promise(resolve => setTimeout(resolve, 100));

        this.logger.debug('Order record created', {orderId: order.orderId});
    }
}