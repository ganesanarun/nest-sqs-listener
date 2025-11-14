
import {DeleteMessageCommand} from '@aws-sdk/client-sqs';
import {SQSMessage} from '../../src';
import {MessageContextImpl} from "../../src/listener/message-context.impl";
import {Logger} from "@nestjs/common";

describe('MessageContext', () => {
    let mockSQSClient: any;
    let testMessage: SQSMessage;
    const logger: Logger = new Logger('MessageContextTest');
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
                ApproximateReceiveCount: '3',
                SentTimestamp: '1234567890',
            },
            MessageAttributes: {
                'X-Trace-Id': {
                    StringValue: 'trace-123',
                    DataType: 'String',
                },
                'CustomAttribute': {
                    StringValue: 'custom-value',
                    DataType: 'String',
                },
            },
        };
    });

    describe('getMessageId', () => {
        it('should return correct message ID', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const result = context.getMessageId();

            expect(result).toBe('test-message-id-123');
        });
    });

    describe('getReceiptHandle', () => {
        it('should return correct receipt handle', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const result = context.getReceiptHandle();

            expect(result).toBe('test-receipt-handle-456');
        });
    });

    describe('getQueueUrl', () => {
        it('should return correct queue URL', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const result = context.getQueueUrl();

            expect(result).toBe(testQueueUrl);
        });
    });

    describe('getMessageAttributes', () => {
        it('should return message attributes', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const attributes = context.getMessageAttributes();

            expect(attributes).toEqual({
                'X-Trace-Id': {
                    StringValue: 'trace-123',
                    DataType: 'String',
                },
                'CustomAttribute': {
                    StringValue: 'custom-value',
                    DataType: 'String',
                },
            });
        });

        it('should return empty object when message has no attributes', () => {
            const messageWithoutAttributes: SQSMessage = {
                MessageId: 'test-id',
                ReceiptHandle: 'test-handle',
                Body: '{}',
            };
            const context = new MessageContextImpl(
                messageWithoutAttributes,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            const result = context.getMessageAttributes();

            expect(result).toEqual({});
        });
    });

    describe('getSystemAttributes', () => {
        it('should return system attributes', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const attributes = context.getSystemAttributes();

            expect(attributes).toEqual({
                ApproximateReceiveCount: '3',
                SentTimestamp: '1234567890',
            });
        });

        it('should return empty object when message has no system attributes', () => {
            const messageWithoutAttributes: SQSMessage = {
                MessageId: 'test-id',
                ReceiptHandle: 'test-handle',
                Body: '{}',
            };
            const context = new MessageContextImpl(
                messageWithoutAttributes,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            const result = context.getSystemAttributes();

            expect(result).toEqual({});
        });
    });

    describe('getApproximateReceiveCount', () => {
        it('should parse and return receive count', () => {
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            const result = context.getApproximateReceiveCount();

            expect(result).toBe(3);
        });

        it('should return 0 when ApproximateReceiveCount is not present', () => {
            const messageWithoutCount: SQSMessage = {
                MessageId: 'test-id',
                ReceiptHandle: 'test-handle',
                Body: '{}',
                Attributes: {},
            };
            const context = new MessageContextImpl(
                messageWithoutCount,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            const result = context.getApproximateReceiveCount();

            expect(result).toBe(0);
        });

        it('should return 0 when ApproximateReceiveCount is not a valid number', () => {
            const messageWithInvalidCount: SQSMessage = {
                MessageId: 'test-id',
                ReceiptHandle: 'test-handle',
                Body: '{}',
                Attributes: {
                    ApproximateReceiveCount: 'invalid',
                },
            };
            const context = new MessageContextImpl(
                messageWithInvalidCount,
                testQueueUrl,
                mockSQSClient,
                logger
            );

            const result = context.getApproximateReceiveCount();

            expect(result).toBe(0);
        });
    });

    describe('acknowledge', () => {
        it('should call DeleteMessage with correct parameters', async () => {
            mockSQSClient.send.mockResolvedValue({});
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            await context.acknowledge();

            expect(mockSQSClient.send).toHaveBeenCalledTimes(1);
            const command = mockSQSClient.send.mock.calls[0][0];
            expect(command).toBeInstanceOf(DeleteMessageCommand);
            expect(command.input).toEqual({
                QueueUrl: testQueueUrl,
                ReceiptHandle: 'test-receipt-handle-456',
            });
        });

        it('should handle errors gracefully without throwing', async () => {
            const error = new Error('SQS service error');
            mockSQSClient.send.mockRejectedValue(error);
            const consoleErrorSpy = jest.spyOn(logger, 'error').mockImplementation();
            const context = new MessageContextImpl(testMessage, testQueueUrl, mockSQSClient, logger);

            await expect(context.acknowledge()).resolves.not.toThrow();

            expect(consoleErrorSpy.mock.calls[0][0]).toContain('Failed to acknowledge message test-message-id-123: SQS service error');
            consoleErrorSpy.mockRestore();
        });
    });
});
