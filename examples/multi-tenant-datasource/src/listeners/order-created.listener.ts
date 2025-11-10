import { Injectable, Logger } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { OrderCreatedEvent } from '../events/order-created.event';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { TenantResources } from '../interfaces/tenant-resources.interface';
import { OrderService } from '../services/order.service';

/**
 * Listener for order created events with multi-tenant datasource selection.
 * 
 * The listener receives:
 * - Validated payload (OrderCreatedEvent)
 * - Tenant context (tenantId, region) extracted from message attributes
 * - Tenant resources (datasource) automatically provisioned and cached
 */
@Injectable()
export class OrderCreatedListener
  implements QueueListener<OrderCreatedEvent, TenantContext, TenantResources>
{
  private readonly logger = new Logger(OrderCreatedListener.name);

  constructor(private readonly orderService: OrderService) {}

  async onMessage(
    payload: OrderCreatedEvent,
    context: MessageContext<TenantContext, TenantResources>,
  ): Promise<void> {
    // Get strongly-typed tenant context
    const tenantContext = context.getContext()!;
    const { tenantId, region } = tenantContext;

    // Get strongly-typed tenant resources
    const resources = context.getResources()!;
    const { dataSource } = resources;

    this.logger.log(
      `Processing order ${payload.orderId} for tenant ${tenantId} using datasource ${dataSource.getName()}`,
    );

    // Process the order using tenant-specific datasource
    await this.orderService.processOrder(payload, tenantId, dataSource);

    this.logger.log(
      `Successfully processed order ${payload.orderId} for tenant ${tenantId}`,
    );
  }
}
