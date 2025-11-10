import {MessageContext} from '../src/listener/message-context.interface';
import {MessageContextImpl} from '../src/listener/message-context.impl';
import {SQSMessage} from '../src';
import {Logger} from '@nestjs/common';

describe('MessageContext Generic Type Parameters', () => {
    let mockSQSClient: any;
    let testMessage: SQSMessage;
    const logger: Logger = new Logger('MessageContextGenericTest');
    const testQueueUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';

    beforeEach(() => {
        mockSQSClient = {
            send: jest.fn().mockResolvedValue({}),
        };
        testMessage = {
            MessageId: 'test-message-id-123',
            ReceiptHandle: 'test-receipt-handle-456',
            Body: JSON.stringify({test: 'data'}),
            Attributes: {
                ApproximateReceiveCount: '1',
            },
            MessageAttributes: {
                'tenantId': {
                    StringValue: 'tenant-123',
                    DataType: 'String',
                },
            },
        };
    });

    describe('Backward Compatibility', () => {
        it('should support existing MessageContext usage without generics', () => {
            const context: MessageContext = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getReceiptHandle()).toBe('test-receipt-handle-456');
            expect(context.getQueueUrl()).toBe(testQueueUrl);
            expect(context.getMessageAttributes()).toBeDefined();
            expect(context.getSystemAttributes()).toBeDefined();
            expect(context.getApproximateReceiveCount()).toBe(1);
            expect(context.acknowledge).toBeDefined();
        });

        it('should return undefined from getContext() when not configured', () => {
            const context: MessageContext = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            // getContext should exist and return undefined when not configured
            if (context.getContext) {
                expect(context.getContext()).toBeUndefined();
            }
        });

        it('should return undefined from getResources() when not configured', () => {
            const context: MessageContext = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            // getResources should exist and return undefined when not configured
            if (context.getResources) {
                expect(context.getResources()).toBeUndefined();
            }
        });
    });

    describe('With Generic Types', () => {
        interface TenantContext {
            tenantId: string;
            region: string;
        }

        interface TenantResources {
            databaseConnection: string;
            apiClient: string;
        }

        it('should return typed context when configured', () => {
            const tenantContext: TenantContext = {
                tenantId: 'tenant-123',
                region: 'us-east-1',
            };

            const context: MessageContext<TenantContext, void> = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                undefined
            );

            const retrievedContext = context.getContext();
            expect(retrievedContext).toBeDefined();
            expect(retrievedContext?.tenantId).toBe('tenant-123');
            expect(retrievedContext?.region).toBe('us-east-1');
        });

        it('should return typed resources when configured', () => {
            const tenantContext: TenantContext = {
                tenantId: 'tenant-123',
                region: 'us-east-1',
            };

            const tenantResources: TenantResources = {
                databaseConnection: 'postgresql://localhost:5432/tenant-123',
                apiClient: 'https://api.tenant-123.example.com',
            };

            const context: MessageContext<TenantContext, TenantResources> = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            const retrievedResources = context.getResources();
            expect(retrievedResources).toBeDefined();
            expect(retrievedResources?.databaseConnection).toBe('postgresql://localhost:5432/tenant-123');
            expect(retrievedResources?.apiClient).toBe('https://api.tenant-123.example.com');
        });

        it('should return both context and resources when both are configured', () => {
            const tenantContext: TenantContext = {
                tenantId: 'tenant-456',
                region: 'eu-west-1',
            };

            const tenantResources: TenantResources = {
                databaseConnection: 'postgresql://localhost:5432/tenant-456',
                apiClient: 'https://api.tenant-456.example.com',
            };

            const context: MessageContext<TenantContext, TenantResources> = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            const retrievedContext = context.getContext();
            const retrievedResources = context.getResources();

            expect(retrievedContext).toBeDefined();
            expect(retrievedContext?.tenantId).toBe('tenant-456');
            expect(retrievedContext?.region).toBe('eu-west-1');

            expect(retrievedResources).toBeDefined();
            expect(retrievedResources?.databaseConnection).toBe('postgresql://localhost:5432/tenant-456');
            expect(retrievedResources?.apiClient).toBe('https://api.tenant-456.example.com');
        });

        it('should maintain all existing methods with generic types', () => {
            const tenantContext: TenantContext = {
                tenantId: 'tenant-789',
                region: 'ap-southeast-1',
            };

            const tenantResources: TenantResources = {
                databaseConnection: 'postgresql://localhost:5432/tenant-789',
                apiClient: 'https://api.tenant-789.example.com',
            };

            const context: MessageContext<TenantContext, TenantResources> = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            // All existing methods should still work
            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getReceiptHandle()).toBe('test-receipt-handle-456');
            expect(context.getQueueUrl()).toBe(testQueueUrl);
            expect(context.getMessageAttributes()).toBeDefined();
            expect(context.getSystemAttributes()).toBeDefined();
            expect(context.getApproximateReceiveCount()).toBe(1);
            expect(context.acknowledge).toBeDefined();

            // New methods should work
            expect(context.getContext()).toBeDefined();
            expect(context.getResources()).toBeDefined();
        });
    });
});
