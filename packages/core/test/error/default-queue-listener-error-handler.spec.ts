import {DefaultQueueListenerErrorHandler} from '../../src/error/default-queue-listener-error-handler';
import {LoggerInterface, MessageContext} from '../../src';

describe('DefaultQueueListenerErrorHandler', () => {
    let errorHandler: DefaultQueueListenerErrorHandler;
    let mockLogger: jest.Mocked<LoggerInterface>;
    let mockContext: jest.Mocked<MessageContext>;

    beforeEach(() => {
        mockLogger = {
            error: jest.fn(),
            log: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        } as any;
        mockContext = {
            getMessageId: jest.fn().mockReturnValue('test-message-id-123'),
            getReceiptHandle: jest.fn().mockReturnValue('test-receipt-handle'),
            getQueueUrl: jest.fn().mockReturnValue('https://sqs.us-east-1.amazonaws.com/123456789/test-queue'),
            getMessageAttributes: jest.fn().mockReturnValue({}),
            getSystemAttributes: jest.fn().mockReturnValue({}),
            getApproximateReceiveCount: jest.fn().mockReturnValue(1),
            acknowledge: jest.fn().mockResolvedValue(undefined),
        } as any;
        errorHandler = new DefaultQueueListenerErrorHandler(mockLogger);
    });

    describe('handleError', () => {
        it('should log error with message ID and error details', async () => {
            const testError = new Error('Test error message');
            testError.stack = 'Error: Test error message\n    at test.js:1:1';
            const testMessage = {orderId: '123', amount: 100};

            await errorHandler.handleError(testError, testMessage, mockContext);

            expect(mockLogger.error).toHaveBeenCalledTimes(1);
            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error processing message test-message-id-123: Test error message',
                testError.stack
            );
        });

        it('should not acknowledge by default (allows retry)', async () => {
            const testError = new Error('Test error');
            const testMessage = {data: 'test'};

            await errorHandler.handleError(testError, testMessage, mockContext);

            expect(mockContext.acknowledge).not.toHaveBeenCalled();
        });

        it('should log error even when error has no stack trace', async () => {
            const testError = new Error('Error without stack');
            delete testError.stack;
            const testMessage = {data: 'test'};

            await errorHandler.handleError(testError, testMessage, mockContext);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error processing message test-message-id-123: Error without stack',
                undefined
            );
        });

        it('should handle non-Error objects', async () => {
            const testError = 'String error';
            const testMessage = {data: 'test'};

            await errorHandler.handleError(testError as any, testMessage, mockContext);

            expect(mockLogger.error).toHaveBeenCalledWith(
                'Error processing message test-message-id-123: String error',
                undefined
            );
        });
    });
});
