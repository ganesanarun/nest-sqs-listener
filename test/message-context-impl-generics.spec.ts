import {MessageContextImpl} from '../src/listener/message-context.impl';
import {SQSMessage} from '../src';
import {Logger} from '@nestjs/common';

describe('MessageContextImpl Generic Type Parameters', () => {
    let mockSQSClient: any;
    let testMessage: SQSMessage;
    const logger: Logger = new Logger('MessageContextImplGenericTest');
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
                ApproximateReceiveCount: '2',
            },
            MessageAttributes: {
                'tenantId': {
                    StringValue: 'tenant-123',
                    DataType: 'String',
                },
            },
        };
    });

    describe('Constructor', () => {
        it('should construct with no context/resources (backward compatibility)', () => {
            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            expect(context).toBeDefined();
            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getContext()).toBeUndefined();
            expect(context.getResources()).toBeUndefined();
        });

        it('should construct with context only', () => {
            interface TenantContext {
                tenantId: string;
                region: string;
            }

            const tenantContext: TenantContext = {
                tenantId: 'tenant-123',
                region: 'us-east-1',
            };

            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                undefined
            );

            expect(context).toBeDefined();
            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getContext()).toEqual(tenantContext);
            expect(context.getResources()).toBeUndefined();
        });

        it('should construct with context and resources', () => {
            interface TenantContext {
                tenantId: string;
                region: string;
            }

            interface TenantResources {
                databaseConnection: string;
                apiClient: string;
            }

            const tenantContext: TenantContext = {
                tenantId: 'tenant-456',
                region: 'eu-west-1',
            };

            const tenantResources: TenantResources = {
                databaseConnection: 'postgresql://localhost:5432/tenant-456',
                apiClient: 'https://api.tenant-456.example.com',
            };

            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            expect(context).toBeDefined();
            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getContext()).toEqual(tenantContext);
            expect(context.getResources()).toEqual(tenantResources);
        });
    });

    describe('Existing Methods', () => {
        it('should verify all existing methods work unchanged with no context/resources', () => {
            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getReceiptHandle()).toBe('test-receipt-handle-456');
            expect(context.getQueueUrl()).toBe(testQueueUrl);
            expect(context.getMessageAttributes()).toEqual({
                'tenantId': {
                    StringValue: 'tenant-123',
                    DataType: 'String',
                },
            });
            expect(context.getSystemAttributes()).toEqual({
                ApproximateReceiveCount: '2',
            });
            expect(context.getApproximateReceiveCount()).toBe(2);
            expect(context.acknowledge).toBeDefined();
        });

        it('should verify all existing methods work unchanged with context and resources', () => {
            interface TenantContext {
                tenantId: string;
            }

            interface TenantResources {
                databaseConnection: string;
            }

            const tenantContext: TenantContext = {tenantId: 'tenant-789'};
            const tenantResources: TenantResources = {databaseConnection: 'db-connection'};

            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            expect(context.getMessageId()).toBe('test-message-id-123');
            expect(context.getReceiptHandle()).toBe('test-receipt-handle-456');
            expect(context.getQueueUrl()).toBe(testQueueUrl);
            expect(context.getMessageAttributes()).toEqual({
                'tenantId': {
                    StringValue: 'tenant-123',
                    DataType: 'String',
                },
            });
            expect(context.getSystemAttributes()).toEqual({
                ApproximateReceiveCount: '2',
            });
            expect(context.getApproximateReceiveCount()).toBe(2);
            expect(context.acknowledge).toBeDefined();
        });

        it('should verify acknowledge() works with context and resources', async () => {
            interface TenantContext {
                tenantId: string;
            }

            interface TenantResources {
                databaseConnection: string;
            }

            const tenantContext: TenantContext = {tenantId: 'tenant-999'};
            const tenantResources: TenantResources = {databaseConnection: 'db-connection'};

            mockSQSClient.send.mockResolvedValue({});

            const context = new MessageContextImpl(
                testMessage,
                testQueueUrl,
                mockSQSClient,
                logger,
                tenantContext,
                tenantResources
            );

            await expect(context.acknowledge()).resolves.not.toThrow();
            expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
        });
    });
});
