import {SQSClient} from '@aws-sdk/client-sqs';
import {SqsMessageListenerContainer} from '../src/container/sqs-message-listener-container';
import {QueueListener} from '../src/listener/queue-listener.interface';
import {MessageContext} from '../src/listener/message-context.interface';

// Mock SQSClient
jest.mock('@aws-sdk/client-sqs');

describe('SqsMessageListenerContainer Generic Type Parameters', () => {
    let sqsClient: SQSClient & { send: jest.Mock };

    beforeEach(() => {
        sqsClient = {
            send: jest.fn().mockResolvedValue({Messages: []}),
        } as any;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('Backward Compatibility', () => {
        it('should support existing container usage without generics', () => {
            interface OrderEvent {
                orderId: string;
                amount: number;
            }

            // Existing usage without context/resource generics
            const container = new SqsMessageListenerContainer<OrderEvent>(sqsClient);

            expect(container).toBeDefined();
            expect(container.configure).toBeDefined();
            expect(container.setMessageListener).toBeDefined();
            expect(container.setErrorHandler).toBeDefined();
            expect(container.setId).toBeDefined();
        });

        it('should support container with single generic (payload only)', () => {
            interface CustomerEvent {
                customerId: string;
                action: string;
            }

            class CustomerListener implements QueueListener<CustomerEvent> {
                async onMessage(payload: CustomerEvent, context: MessageContext): Promise<void> {
                    // Implementation
                }
            }

            const container = new SqsMessageListenerContainer<CustomerEvent>(sqsClient);
            const listener = new CustomerListener();

            container.configure(options => {
                options.queueName('customer-queue').autoStartup(false);
            });
            container.setMessageListener(listener);

            expect(container).toBeDefined();
        });

        it('should support container with all three generics', () => {
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
                apiClient: string;
            }

            class ProductListener implements QueueListener<ProductEvent, TenantContext, TenantResources> {
                async onMessage(
                    payload: ProductEvent,
                    context: MessageContext<TenantContext, TenantResources>
                ): Promise<void> {
                    const ctx = context.getContext();
                    const resources = context.getResources();
                    // Implementation using context and resources
                }
            }

            const container = new SqsMessageListenerContainer<ProductEvent, TenantContext, TenantResources>(
                sqsClient
            );
            const listener = new ProductListener();

            container.configure(options => {
                options.queueName('product-queue').autoStartup(false);
            });
            container.setMessageListener(listener);

            expect(container).toBeDefined();
        });

        it('should maintain existing configuration API with generics', () => {
            interface OrderEvent {
                orderId: string;
            }

            interface TenantContext {
                tenantId: string;
            }

            interface TenantResources {
                database: string;
            }

            const container = new SqsMessageListenerContainer<OrderEvent, TenantContext, TenantResources>(
                sqsClient
            );

            // All existing configuration methods should work
            expect(() => {
                container.configure(options => {
                    options
                        .queueName('test-queue')
                        .pollTimeout(20)
                        .visibilityTimeout(30)
                        .maxConcurrentMessages(10)
                        .maxMessagesPerPoll(5)
                        .autoStartup(false);
                });
            }).not.toThrow();

            expect(() => {
                container.setId('test-container');
            }).not.toThrow();
        });

        it('should accept listener with matching generic types', () => {
            interface EventPayload {
                eventId: string;
            }

            interface AppContext {
                userId: string;
            }

            interface AppResources {
                connection: string;
            }

            class EventListener implements QueueListener<EventPayload, AppContext, AppResources> {
                async onMessage(
                    payload: EventPayload,
                    context: MessageContext<AppContext, AppResources>
                ): Promise<void> {
                    // Implementation
                }
            }

            const container = new SqsMessageListenerContainer<EventPayload, AppContext, AppResources>(
                sqsClient
            );
            const listener = new EventListener();

            expect(() => {
                container.setMessageListener(listener);
            }).not.toThrow();
        });
    });

    describe('Type Safety', () => {
        it('should enforce type compatibility between container and listener', () => {
            interface OrderEvent {
                orderId: string;
            }

            interface TenantContext {
                tenantId: string;
            }

            interface TenantResources {
                database: string;
            }

            // This should compile - matching types
            const container = new SqsMessageListenerContainer<OrderEvent, TenantContext, TenantResources>(
                sqsClient
            );

            class OrderListener implements QueueListener<OrderEvent, TenantContext, TenantResources> {
                async onMessage(
                    payload: OrderEvent,
                    context: MessageContext<TenantContext, TenantResources>
                ): Promise<void> {
                    // Implementation
                }
            }

            const listener = new OrderListener();
            container.setMessageListener(listener);

            expect(container).toBeDefined();
        });
    });
});
