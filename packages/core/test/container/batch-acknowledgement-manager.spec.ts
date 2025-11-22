import {SQSClient} from '@aws-sdk/client-sqs';
import {BatchAcknowledgementManager, LoggerInterface} from '../../src';

describe('BatchAcknowledgementManager', () => {
    let sqsClient: SQSClient & { send: jest.Mock };
    let logger: jest.Mocked<LoggerInterface>;
    let manager: BatchAcknowledgementManager;

    beforeEach(() => {
        sqsClient = {
            send: jest.fn().mockResolvedValue({Failed: []}),
        } as any;

        logger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
        };

        manager = new BatchAcknowledgementManager(sqsClient, logger);
    });

    describe('acknowledge', () => {
        it('should queue a single message without immediate flush', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-url');

            expect(sqsClient.send).not.toHaveBeenCalled();
            expect(manager.getPendingCount()).toBe(1);
        });

        it('should automatically flush when batch size reaches 10', async () => {
            // Queue 10 messages
            for (let i = 0; i < 10; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            expect(sqsClient.send).toHaveBeenCalledTimes(1);
            expect(sqsClient.send).toHaveBeenCalledWith(
                expect.objectContaining({
                    input: expect.objectContaining({
                        QueueUrl: 'queue-url',
                        Entries: expect.arrayContaining([
                            expect.objectContaining({
                                Id: 'msg-0',
                                ReceiptHandle: 'receipt-0',
                            }),
                        ]),
                    }),
                })
            );
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should handle multiple batches for same queue', async () => {
            // Queue 25 messages (will create 3 batches: 10 + 10 + 5)
            for (let i = 0; i < 25; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            // Should have flushed twice (at 10 and 20)
            expect(sqsClient.send).toHaveBeenCalledTimes(2);
            expect(manager.getPendingCount()).toBe(5);
        });

        it('should handle multiple queues independently', async () => {
            // Queue messages to different queues
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-1');
            await manager.acknowledge('msg-2', 'receipt-2', 'queue-2');
            await manager.acknowledge('msg-3', 'receipt-3', 'queue-1');

            expect(manager.getPendingCount()).toBe(3);
            expect(sqsClient.send).not.toHaveBeenCalled();
        });
    });

    describe('flushAll', () => {
        it('should flush all pending messages', async () => {
            // Queue some messages
            for (let i = 0; i < 5; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            await manager.flushAll();

            expect(sqsClient.send).toHaveBeenCalledTimes(1);
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should flush messages from multiple queues', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-1');
            await manager.acknowledge('msg-2', 'receipt-2', 'queue-2');
            await manager.acknowledge('msg-3', 'receipt-3', 'queue-1');

            await manager.flushAll();

            expect(sqsClient.send).toHaveBeenCalledTimes(2); // One for each queue
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should handle empty queue gracefully', async () => {
            await manager.flushAll();

            expect(sqsClient.send).not.toHaveBeenCalled();
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should flush large batches in chunks of 10', async () => {
            // Queue 23 messages to one queue
            for (let i = 0; i < 23; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            // Auto-flushes happened at 10 and 20, leaving 3 pending
            expect(manager.getPendingCount()).toBe(3);

            // Clear previous auto-flushes
            sqsClient.send.mockClear();

            await manager.flushAll();

            // Should flush the remaining 3 in 1 call
            expect(sqsClient.send).toHaveBeenCalledTimes(1);
            expect(manager.getPendingCount()).toBe(0);
        });
    });

    describe('error handling', () => {
        it('should log errors but not throw when batch delete fails', async () => {
            sqsClient.send.mockRejectedValueOnce(new Error('SQS Error'));

            for (let i = 0; i < 10; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to batch acknowledge'),
                expect.any(String)
            );
        });

        it('should handle partial failures in batch', async () => {
            sqsClient.send.mockResolvedValueOnce({
                Failed: [
                    {Id: 'msg-5', Code: 'InvalidHandle', Message: 'Invalid receipt handle'},
                ],
            });

            for (let i = 0; i < 10; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to acknowledge message msg-5'),
                'InvalidHandle'
            );
        });

        it('should retry messages on flush failure', async () => {
            sqsClient.send.mockRejectedValueOnce(new Error('Network error'));

            for (let i = 0; i < 10; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            // Messages should be put back after failure
            expect(manager.getPendingCount()).toBe(10);
        });
    });

    describe('shutdown', () => {
        it('should flush all pending messages on shutdown', async () => {
            for (let i = 0; i < 5; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            await manager.shutdown();

            expect(sqsClient.send).toHaveBeenCalled();
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should clear all state after shutdown', async () => {
            for (let i = 0; i < 5; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            await manager.shutdown();

            expect(manager.getPendingCount()).toBe(0);
        });
    });

    describe('timer-based flush', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        it('should schedule flush for partial batches', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-url');

            expect(sqsClient.send).not.toHaveBeenCalled();

            // Fast-forward timer
            jest.advanceTimersByTime(100);
            await Promise.resolve(); // Let promises resolve

            expect(sqsClient.send).toHaveBeenCalledTimes(1);
        });

        it('should not schedule multiple timers', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-url');
            await manager.acknowledge('msg-2', 'receipt-2', 'queue-url');

            // Should only have one timer scheduled
            expect(jest.getTimerCount()).toBe(1);
        });
    });

    describe('getPendingCount', () => {
        it('should return 0 for empty manager', () => {
            expect(manager.getPendingCount()).toBe(0);
        });

        it('should return correct count for single queue', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-url');
            await manager.acknowledge('msg-2', 'receipt-2', 'queue-url');

            expect(manager.getPendingCount()).toBe(2);
        });

        it('should return total count across multiple queues', async () => {
            await manager.acknowledge('msg-1', 'receipt-1', 'queue-1');
            await manager.acknowledge('msg-2', 'receipt-2', 'queue-2');
            await manager.acknowledge('msg-3', 'receipt-3', 'queue-3');

            expect(manager.getPendingCount()).toBe(3);
        });

        it('should update count after flush', async () => {
            for (let i = 0; i < 10; i++) {
                await manager.acknowledge(`msg-${i}`, `receipt-${i}`, 'queue-url');
            }

            expect(manager.getPendingCount()).toBe(0); // Auto-flushed at 10
        });
    });
});
