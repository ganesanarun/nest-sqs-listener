import { Injectable, Logger } from '@nestjs/common';
import { OrderCreatedEvent } from '../events/order-created.event';
import { TenantDataSource } from '../datasource/tenant-datasource';

/**
 * Business logic for processing orders.
 * Separated from the listener for better testability and maintainability.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  /**
   * Process an order using the tenant-specific datasource.
   * In a real application, this would:
   * - Insert order into tenant database
   * - Update inventory
   * - Trigger downstream processes
   * - Send notifications
   */
  async processOrder(
    order: OrderCreatedEvent,
    tenantId: string,
    dataSource: TenantDataSource,
  ): Promise<void> {
    this.logger.log(
      `Processing order ${order.orderId} for customer ${order.customerId} (amount: $${order.amount})`,
    );

    // Simulate database operations using tenant-specific datasource
    await dataSource.query(
      'INSERT INTO orders (order_id, customer_id, amount, tenant_id) VALUES ($1, $2, $3, $4)',
      [order.orderId, order.customerId, order.amount, tenantId],
    );

    // Simulate additional business logic
    await this.updateInventory(order, dataSource);
    await this.sendConfirmation(order, tenantId);

    this.logger.log(`Order ${order.orderId} processed successfully`);
  }

  private async updateInventory(
    order: OrderCreatedEvent,
    dataSource: TenantDataSource,
  ): Promise<void> {
    // Simulate inventory update
    await dataSource.query(
      'UPDATE inventory SET quantity = quantity - 1 WHERE order_id = $1',
      [order.orderId],
    );
  }

  private async sendConfirmation(
    order: OrderCreatedEvent,
    tenantId: string,
  ): Promise<void> {
    // Simulate sending confirmation
    this.logger.debug(
      `Sending order confirmation for ${order.orderId} to customer ${order.customerId} (tenant: ${tenantId})`,
    );
  }
}
