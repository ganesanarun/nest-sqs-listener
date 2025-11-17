import {MessageContext} from './message-context.interface';

/**
 * Interface for implementing message handling logic.
 * Implementations define how to process typed messages received from SQS queues.
 *
 * @template T The type of the message payload
 *
 * @example
 * ```typescript
 * @Injectable()
 * export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
 *   constructor(private readonly orderService: OrderService) {}
 *
 *   async onMessage(payload: OrderCreatedEvent, context: MessageContext): Promise<void> {
 *     await this.orderService.processOrder(payload);
 *   }
 * }
 * ```
 */
export interface QueueListener<T> {
    /**
     * Process a message received from the SQS queue.
     *
     * @param payload The typed message payload, converted from the raw SQS message body
     * @param context The message context containing metadata and control methods
     * @returns Promise that resolves when message processing is complete
     * @throws Error if message processing fails
     */
    onMessage(payload: T, context: MessageContext): Promise<void>;
}
