import { Injectable, Logger } from '@nestjs/common';
import { OrderCreatedEvent } from '../events/order-created.event';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  async processNewOrder(order: OrderCreatedEvent): Promise<void> {
    this.logger.log(`Processing order ${order.orderId} for customer ${order.customerId}`);
    this.logger.log(`Order amount: ${order.amount}`);
    this.logger.log(`Items: ${order.items.length}`);
    
    // Simulate some processing
    await this.delay(500);
    
    this.logger.log(`Order ${order.orderId} processed successfully`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
