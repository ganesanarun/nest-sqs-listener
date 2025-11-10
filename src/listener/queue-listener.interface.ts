import {MessageContext} from './message-context.interface';

/**
 * Interface for implementing message handling logic.
 * Implementations define how to process typed messages received from SQS queues.
 *
 * @template TPayload The type of the message payload
 * @template TContext The type of the context object (defaults to void for backward compatibility)
 * @template TResources The type of the resources object (defaults to void for backward compatibility)
 *
 * @example
 * ```typescript
 * // Basic usage without context/resources (backward compatible)
 * @Injectable()
 * export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
 *   constructor(private readonly orderService: OrderService) {}
 *
 *   async onMessage(payload: OrderCreatedEvent, context: MessageContext): Promise<void> {
 *     await this.orderService.processOrder(payload);
 *   }
 * }
 *
 * // Advanced usage with context and resources
 * @Injectable()
 * export class TenantOrderListener implements QueueListener<OrderEvent, TenantContext, TenantResources> {
 *   async onMessage(
 *     payload: OrderEvent,
 *     context: MessageContext<TenantContext, TenantResources>
 *   ): Promise<void> {
 *     const { tenantId } = context.getContext()!;
 *     const { dataSource } = context.getResources()!;
 *     await dataSource.saveOrder(payload, tenantId);
 *   }
 * }
 * ```
 */
export interface QueueListener<TPayload, TContext = void, TResources = void> {
    /**
     * Process a message received from the SQS queue.
     *
     * @param payload The typed message payload, converted from the raw SQS message body
     * @param context The message context containing metadata, control methods, and optional context/resources
     * @returns Promise that resolves when message processing is complete
     * @throws Error if message processing fails
     */
    onMessage(payload: TPayload, context: MessageContext<TContext, TResources>): Promise<void>;
}
