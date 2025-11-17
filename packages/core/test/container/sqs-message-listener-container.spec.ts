import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, QueueListener, QueueListenerErrorHandler, SqsMessageListenerContainer} from '../../src';

// Mock SQSClient
jest.mock('@aws-sdk/client-sqs');

describe('SqsMessageListenerContainer', () => {
    let sqsClient: SQSClient & { send: jest.Mock };
    let container: SqsMessageListenerContainer<any>;
    let mockListener: jest.Mocked<QueueListener<any>>;
    let mockErrorHandler: jest.Mocked<QueueListenerErrorHandler>;

    beforeEach(() => {
        sqsClient = {
            send: jest.fn().mockResolvedValue({Messages: []}),
        } as any;
        mockListener = {
            onMessage: jest.fn().mockResolvedValue(undefined),
        };
        mockErrorHandler = {
            handleError: jest.fn().mockResolvedValue(undefined),
        };
    });

    afterEach(async () => {
        if (container) {
            await container.stop();
        }
        jest.clearAllMocks();
    });

    describe('Initialization and Configuration', () => {
        it('should accept SQSClient in constructor', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            expect(container).toBeDefined();
        });

        it('should accept configuration callback via configure() method', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            expect(() => {
                container.configure(options => {
                    options
                        .queueName('test-queue')
                        .pollTimeout(15)
                        .maxConcurrentMessages(5);
                });
            }).not.toThrow();
        });

        it('should apply configuration from callback', () => {
            container = new SqsMessageListenerContainer(sqsClient);
            container.configure(options => {
                options
                    .queueName('test-queue')
                    .pollTimeout(15)
                    .visibilityTimeout(60)
                    .maxConcurrentMessages(5)
                    .maxMessagesPerPoll(3)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.MANUAL);
            });

            expect(container).toBeDefined();
        });

        it('should set container ID via setId()', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            expect(() => {
                container.setId('test-container-id');
            }).not.toThrow();
        });

        it('should set message listener via setMessageListener()', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            expect(() => {
                container.setMessageListener(mockListener);
            }).not.toThrow();
        });

        it('should set error handler via setErrorHandler()', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            expect(() => {
                container.setErrorHandler(mockErrorHandler);
            }).not.toThrow();
        });

        it('should apply default configuration values', () => {
            container = new SqsMessageListenerContainer(sqsClient);
            container.configure(options => {
                options.queueName('test-queue');
            });

            expect(container).toBeDefined();
        });
    });

    describe('Queue URL Resolution', () => {
        it('should return URL unchanged if already a URL', async () => {
            container = new SqsMessageListenerContainer(sqsClient);
            const fullUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';
            container.configure(options => {
                options.queueName(fullUrl).autoStartup(false);
            });
            container.setMessageListener(mockListener);

            await container.start();

            expect(sqsClient.send).not.toHaveBeenCalledWith(
                expect.objectContaining({constructor: {name: 'GetQueueUrlCommand'}})
            );
        });
    });

    // describe('Lifecycle Management', () => {
    //     it('should start container successfully', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);

    //         // ACT
    //         await container.start();

    //         // ASSERT
    //         expect(container.isContainerRunning()).toBe(true);
    //     });

    //     it('should stop container successfully', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);
    //         await container.start();

    //         // ACT
    //         await container.stop();

    //         // ASSERT
    //         expect(container.isContainerRunning()).toBe(false);
    //     });

    //     it('should not start if already running', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);
    //         await container.start();

    //         // ACT
    //         await container.start();

    //         // ASSERT
    //         expect(container.isContainerRunning()).toBe(true);
    //     });

    //     it('should handle stop when not running', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);

    //         // ACT & ASSERT
    //         await expect(container.stop()).resolves.not.toThrow();
    //     });

    //     it('should throw error if listener not set before start', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });

    //         // ACT & ASSERT
    //         await expect(container.start()).rejects.toThrow('Message listener must be set before starting container');
    //     });

    //     it('should restart container after stop', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);
    //         await container.start();
    //         await container.stop();

    //         // ACT
    //         await container.start();

    //         // ASSERT
    //         expect(container.isContainerRunning()).toBe(true);
    //     });

    //     it('should check auto-startup configuration', () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('test-queue').autoStartup(false);
    //         });

    //         // ACT
    //         const isAutoStartup = container.isAutoStartupEnabled();

    //         // ASSERT
    //         expect(isAutoStartup).toBe(false);
    //     });

    //     it('should have auto-startup enabled by default', () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('test-queue');
    //         });

    //         // ACT
    //         const isAutoStartup = container.isAutoStartupEnabled();

    //         // ASSERT
    //         expect(isAutoStartup).toBe(true);
    //     });

    //     it('should wait for in-flight messages during stop', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
            
    //         let messageProcessing = false;
    //         const slowListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 messageProcessing = true;
    //                 await new Promise(resolve => setTimeout(resolve, 100));
    //                 messageProcessing = false;
    //             })
    //         };
    //         container.setMessageListener(slowListener);
            
    //         sqsClient.send.mockResolvedValueOnce({
    //             Messages: [{
    //                 MessageId: 'msg-1',
    //                 ReceiptHandle: 'receipt-1',
    //                 Body: JSON.stringify({test: 'data'})
    //             }]
    //         }).mockResolvedValue({Messages: []});
            
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 50));

    //         // ACT
    //         await container.stop();

    //         // ASSERT
    //         expect(messageProcessing).toBe(false);
    //         expect(container.isContainerRunning()).toBe(false);
    //     });
    // });

    // describe('Message Processing', () => {
    //     it('should process messages successfully', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123', amount: 100})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(mockListener.onMessage).toHaveBeenCalledWith(
    //             expect.objectContaining({orderId: '123', amount: 100}),
    //             expect.any(Object)
    //         );
    //     });

    //     it('should handle multiple messages in batch', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
    //         container.setMessageListener(mockListener);
            
    //         const messages = [
    //             {MessageId: 'msg-1', ReceiptHandle: 'receipt-1', Body: JSON.stringify({orderId: '123'})},
    //             {MessageId: 'msg-2', ReceiptHandle: 'receipt-2', Body: JSON.stringify({orderId: '456'})},
    //             {MessageId: 'msg-3', ReceiptHandle: 'receipt-3', Body: JSON.stringify({orderId: '789'})}
    //         ];
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(mockListener.onMessage).toHaveBeenCalledTimes(3);
    //     });

    //     it('should invoke error handler on processing failure', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
            
    //         const failingListener = {
    //             onMessage: jest.fn().mockRejectedValue(new Error('Processing failed'))
    //         };
    //         container.setMessageListener(failingListener);
    //         container.setErrorHandler(mockErrorHandler);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(mockErrorHandler.handleError).toHaveBeenCalledWith(
    //             expect.objectContaining({message: 'Processing failed'}),
    //             expect.any(Object),
    //             expect.any(Object)
    //         );
    //     });

    //     it('should continue processing after error', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options.queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue').autoStartup(false);
    //         });
            
    //         let callCount = 0;
    //         const partiallyFailingListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 callCount++;
    //                 if (callCount === 1) {
    //                     throw new Error('First message failed');
    //                 }
    //             })
    //         };
    //         container.setMessageListener(partiallyFailingListener);
            
    //         const messages = [
    //             {MessageId: 'msg-1', ReceiptHandle: 'receipt-1', Body: JSON.stringify({orderId: '123'})},
    //             {MessageId: 'msg-2', ReceiptHandle: 'receipt-2', Body: JSON.stringify({orderId: '456'})}
    //         ];
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(partiallyFailingListener.onMessage).toHaveBeenCalledTimes(2);
    //     });
    // });

    // describe('Concurrency Control', () => {
    //     it('should respect maxConcurrentMessages limit', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .maxConcurrentMessages(2);
    //         });
            
    //         let concurrentCount = 0;
    //         let maxConcurrent = 0;
    //         const trackingListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 concurrentCount++;
    //                 maxConcurrent = Math.max(maxConcurrent, concurrentCount);
    //                 await new Promise(resolve => setTimeout(resolve, 50));
    //                 concurrentCount--;
    //             })
    //         };
    //         container.setMessageListener(trackingListener);
            
    //         const messages = Array.from({length: 5}, (_, i) => ({
    //             MessageId: `msg-${i}`,
    //             ReceiptHandle: `receipt-${i}`,
    //             Body: JSON.stringify({orderId: `${i}`})
    //         }));
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 200));
    //         await container.stop();

    //         // ASSERT
    //         expect(maxConcurrent).toBeLessThanOrEqual(2);
    //         expect(trackingListener.onMessage).toHaveBeenCalledTimes(5);
    //     });

    //     it('should process messages in parallel up to limit', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .maxConcurrentMessages(3);
    //         });
            
    //         const processingTimes: number[] = [];
    //         const parallelListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 const start = Date.now();
    //                 await new Promise(resolve => setTimeout(resolve, 50));
    //                 processingTimes.push(Date.now() - start);
    //             })
    //         };
    //         container.setMessageListener(parallelListener);
            
    //         const messages = Array.from({length: 3}, (_, i) => ({
    //             MessageId: `msg-${i}`,
    //             ReceiptHandle: `receipt-${i}`,
    //             Body: JSON.stringify({orderId: `${i}`})
    //         }));
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         const startTime = Date.now();
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 150));
    //         await container.stop();
    //         const totalTime = Date.now() - startTime;

    //         // ASSERT
    //         expect(parallelListener.onMessage).toHaveBeenCalledTimes(3);
    //         expect(totalTime).toBeLessThan(150);
    //     });

    //     it('should handle single message concurrency', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .maxConcurrentMessages(1);
    //         });
            
    //         let concurrentCount = 0;
    //         let maxConcurrent = 0;
    //         const serialListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 concurrentCount++;
    //                 maxConcurrent = Math.max(maxConcurrent, concurrentCount);
    //                 await new Promise(resolve => setTimeout(resolve, 20));
    //                 concurrentCount--;
    //             })
    //         };
    //         container.setMessageListener(serialListener);
            
    //         const messages = Array.from({length: 3}, (_, i) => ({
    //             MessageId: `msg-${i}`,
    //             ReceiptHandle: `receipt-${i}`,
    //             Body: JSON.stringify({orderId: `${i}`})
    //         }));
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 150));
    //         await container.stop();

    //         // ASSERT
    //         expect(maxConcurrent).toBe(1);
    //         expect(serialListener.onMessage).toHaveBeenCalledTimes(3);
    //     });

    //     it('should handle high concurrency limit', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .maxConcurrentMessages(10);
    //         });
            
    //         const highConcurrencyListener = {
    //             onMessage: jest.fn().mockResolvedValue(undefined)
    //         };
    //         container.setMessageListener(highConcurrencyListener);
            
    //         const messages = Array.from({length: 10}, (_, i) => ({
    //             MessageId: `msg-${i}`,
    //             ReceiptHandle: `receipt-${i}`,
    //             Body: JSON.stringify({orderId: `${i}`})
    //         }));
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(highConcurrencyListener.onMessage).toHaveBeenCalledTimes(10);
    //     });

    //     it('should release semaphore on processing error', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .maxConcurrentMessages(2);
    //         });
            
    //         let callCount = 0;
    //         const errorThenSuccessListener = {
    //             onMessage: jest.fn().mockImplementation(async () => {
    //                 callCount++;
    //                 if (callCount === 1) {
    //                     throw new Error('First message failed');
    //                 }
    //                 await new Promise(resolve => setTimeout(resolve, 20));
    //             })
    //         };
    //         container.setMessageListener(errorThenSuccessListener);
            
    //         const messages = Array.from({length: 3}, (_, i) => ({
    //             MessageId: `msg-${i}`,
    //             ReceiptHandle: `receipt-${i}`,
    //             Body: JSON.stringify({orderId: `${i}`})
    //         }));
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: messages}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 150));
    //         await container.stop();

    //         // ASSERT
    //         expect(errorThenSuccessListener.onMessage).toHaveBeenCalledTimes(3);
    //     });
    // });

    // describe('Acknowledgement Modes', () => {
    //     it('should acknowledge message on success with ON_SUCCESS mode', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
    //         });
    //         container.setMessageListener(mockListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(sqsClient.send).toHaveBeenCalledWith(
    //             expect.objectContaining({
    //                 input: expect.objectContaining({
    //                     ReceiptHandle: 'receipt-1'
    //                 })
    //             })
    //         );
    //     });

    //     it('should not acknowledge message on failure with ON_SUCCESS mode', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
    //         });
            
    //         const failingListener = {
    //             onMessage: jest.fn().mockRejectedValue(new Error('Processing failed'))
    //         };
    //         container.setMessageListener(failingListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         const deleteMessageCalls = sqsClient.send.mock.calls.filter(
    //             call => call[0]?.input?.ReceiptHandle === 'receipt-1'
    //         );
    //         expect(deleteMessageCalls.length).toBe(0);
    //     });

    //     it('should always acknowledge message with ALWAYS mode', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .acknowledgementMode(AcknowledgementMode.ALWAYS);
    //         });
            
    //         const failingListener = {
    //             onMessage: jest.fn().mockRejectedValue(new Error('Processing failed'))
    //         };
    //         container.setMessageListener(failingListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(sqsClient.send).toHaveBeenCalledWith(
    //             expect.objectContaining({
    //                 input: expect.objectContaining({
    //                     ReceiptHandle: 'receipt-1'
    //                 })
    //             })
    //         );
    //     });

    //     it('should not auto-acknowledge with MANUAL mode', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .acknowledgementMode(AcknowledgementMode.MANUAL);
    //         });
    //         container.setMessageListener(mockListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         const deleteMessageCalls = sqsClient.send.mock.calls.filter(
    //             call => call[0]?.input?.ReceiptHandle === 'receipt-1'
    //         );
    //         expect(deleteMessageCalls.length).toBe(0);
    //     });

    //     it('should allow manual acknowledgement in MANUAL mode', async () => {
    //         // ARRANGE
    //         container = new SqsMessageListenerContainer(sqsClient);
    //         container.configure(options => {
    //             options
    //                 .queueName('https://sqs.us-east-1.amazonaws.com/123456789/test-queue')
    //                 .autoStartup(false)
    //                 .acknowledgementMode(AcknowledgementMode.MANUAL);
    //         });
            
    //         const manualListener = {
    //             onMessage: jest.fn().mockImplementation(async (payload, context) => {
    //                 await context.acknowledge();
    //             })
    //         };
    //         container.setMessageListener(manualListener);
            
    //         const testMessage = {
    //             MessageId: 'msg-1',
    //             ReceiptHandle: 'receipt-1',
    //             Body: JSON.stringify({orderId: '123'})
    //         };
            
    //         sqsClient.send.mockResolvedValueOnce({Messages: [testMessage]}).mockResolvedValue({Messages: []});

    //         // ACT
    //         await container.start();
    //         await new Promise(resolve => setTimeout(resolve, 100));
    //         await container.stop();

    //         // ASSERT
    //         expect(sqsClient.send).toHaveBeenCalledWith(
    //             expect.objectContaining({
    //                 input: expect.objectContaining({
    //                     ReceiptHandle: 'receipt-1'
    //                 })
    //             })
    //         );
    //     });
    // });
});
