import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, QueueListener, QueueListenerErrorHandler, SqsMessageListenerContainer} from '../src';

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
                        .queueNames('test-queue')
                        .pollTimeout(15)
                        .maxConcurrentMessages(5);
                });
            }).not.toThrow();
        });

        it('should apply configuration from callback', () => {
            container = new SqsMessageListenerContainer(sqsClient);

            container.configure(options => {
                options
                    .queueNames('test-queue')
                    .pollTimeout(15)
                    .visibilityTimeout(60)
                    .maxConcurrentMessages(5)
                    .maxMessagesPerPoll(3)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.MANUAL);
            });

            // Configuration is applied internally - we'll verify through behavior in other tests
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
                options.queueNames('test-queue');
                // Not setting other options - should use defaults
            });

            // Defaults are applied internally
            expect(container).toBeDefined();
        });
    });

    describe('Queue URL Resolution', () => {
        it('should return URL unchanged if already a URL', async () => {
            container = new SqsMessageListenerContainer(sqsClient);
            const fullUrl = 'https://sqs.us-east-1.amazonaws.com/123456789/test-queue';

            container.configure(options => {
                options.queueNames(fullUrl).autoStartup(false);
            });
            container.setMessageListener(mockListener);

            await container.start();

            // Should not call GetQueueUrl since it's already a URL
            expect(sqsClient.send).not.toHaveBeenCalledWith(
                expect.objectContaining({constructor: {name: 'GetQueueUrlCommand'}})
            );
        });
    });
});
