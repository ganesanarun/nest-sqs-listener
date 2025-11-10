import {QueueListener} from '../src/listener/queue-listener.interface';
import {MessageContext} from '../src/listener/message-context.interface';

describe('QueueListener Generic Type Parameters', () => {
    describe('Backward Compatibility', () => {
        it('should support existing QueueListener implementations without generics', async () => {
            // Define a simple payload type
            interface OrderEvent {
                orderId: string;
                amount: number;
            }

            // Existing implementation without context/resource generics
            class OrderListener implements QueueListener<OrderEvent> {
                async onMessage(payload: OrderEvent, context: MessageContext): Promise<void> {
                    // Simple implementation
                    expect(payload.orderId).toBeDefined();
                    expect(context.getMessageId).toBeDefined();
                }
            }

            const listener = new OrderListener();
            const mockContext: MessageContext = {
                getMessageId: () => 'test-id',
                getReceiptHandle: () => 'test-handle',
                getQueueUrl: () => 'test-url',
                getMessageAttributes: () => ({}),
                getSystemAttributes: () => ({}),
                getApproximateReceiveCount: () => 1,
                acknowledge: async () => {},
                getContext: () => undefined,
                getResources: () => undefined,
            };

            const payload: OrderEvent = {orderId: '123', amount: 100};

            await expect(listener.onMessage(payload, mockContext)).resolves.not.toThrow();
        });

        it('should support QueueListener with single generic (payload only)', async () => {
            interface CustomerEvent {
                customerId: string;
                action: string;
            }

            // Implementation with only payload generic
            class CustomerListener implements QueueListener<CustomerEvent> {
                async onMessage(payload: CustomerEvent, context: MessageContext): Promise<void> {
                    expect(payload.customerId).toBeDefined();
                    expect(payload.action).toBeDefined();
                }
            }

            const listener = new CustomerListener();
            const mockContext: MessageContext = {
                getMessageId: () => 'test-id',
                getReceiptHandle: () => 'test-handle',
                getQueueUrl: () => 'test-url',
                getMessageAttributes: () => ({}),
                getSystemAttributes: () => ({}),
                getApproximateReceiveCount: () => 1,
                acknowledge: async () => {},
                getContext: () => undefined,
                getResources: () => undefined,
            };

            const payload: CustomerEvent = {customerId: 'cust-123', action: 'created'};

            await expect(listener.onMessage(payload, mockContext)).resolves.not.toThrow();
        });

        it('should support QueueListener with all three generics', async () => {
            interface ProductEvent {
                productId: string;
                price: number;
            }

            interface TenantContext {
                tenantId: string;
                region: string;
            }

            interface TenantResources {
                databaseConnection: string;
            }

            // Implementation with all three generics
            class ProductListener implements QueueListener<ProductEvent, TenantContext, TenantResources> {
                async onMessage(
                    payload: ProductEvent,
                    context: MessageContext<TenantContext, TenantResources>
                ): Promise<void> {
                    expect(payload.productId).toBeDefined();
                    expect(context.getMessageId).toBeDefined();
                    
                    // These methods should exist (will be implemented in later tasks)
                    if (context.getContext) {
                        const ctx = context.getContext();
                        if (ctx) {
                            expect(ctx.tenantId).toBeDefined();
                        }
                    }
                    
                    if (context.getResources) {
                        const resources = context.getResources();
                        if (resources) {
                            expect(resources.databaseConnection).toBeDefined();
                        }
                    }
                }
            }

            const listener = new ProductListener();
            const mockContext: MessageContext<TenantContext, TenantResources> = {
                getMessageId: () => 'test-id',
                getReceiptHandle: () => 'test-handle',
                getQueueUrl: () => 'test-url',
                getMessageAttributes: () => ({}),
                getSystemAttributes: () => ({}),
                getApproximateReceiveCount: () => 1,
                acknowledge: async () => {},
                getContext: () => ({tenantId: 'tenant-1', region: 'us-east-1'}),
                getResources: () => ({databaseConnection: 'db-connection-string'}),
            };

            const payload: ProductEvent = {productId: 'prod-123', price: 99.99};

            await expect(listener.onMessage(payload, mockContext)).resolves.not.toThrow();
        });
    });
});
