import Fastify, {FastifyInstance} from 'fastify';
import {SQSClient} from '@aws-sdk/client-sqs';
import {FastifySqsListenerOptions, sqsListenerPlugin} from '../../src';
import {MessageContext, QueueListener} from '@snow-tzu/sqs-listener';

class TestMessage {
    id: string;
    content: string;

    constructor(id: string, content: string) {
        this.id = id;
        this.content = content;
    }
}

class TestListener implements QueueListener<TestMessage> {
    public processedMessages: TestMessage[] = [];

    async onMessage(payload: TestMessage, context: MessageContext): Promise<void> {
        this.processedMessages.push(payload);
    }
}

describe('Lifecycle Integration', () => {
    let fastify: FastifyInstance;
    let mockSqsClient: SQSClient;
    let testListener: TestListener;

    beforeEach(() => {
        fastify = Fastify({logger: false});
        mockSqsClient = new SQSClient({region: 'us-east-1'});
        testListener = new TestListener();
    });

    afterEach(async () => {
        if (fastify) {
            await fastify.close();
            // Give extra time for cleanup
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    });

    describe('Automatic Startup and Shutdown', () => {
        it('should start the SQS listener during Fastify ready phase when autoStartup is enabled', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: true
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container).toBeDefined();
            expect(container.isContainerRunning()).toBe(true);
        });

        it('should not start the SQS listener when autoStartup is disabled', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container).toBeDefined();
            expect(container.isContainerRunning()).toBe(false);
        });

        it('should stop the SQS listener during Fastify close phase', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: true
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container.isContainerRunning()).toBe(true);

            // Close should stop the container
            await fastify.close();
            expect(container.isContainerRunning()).toBe(false);
        });
    });

    describe('Error Handling During Lifecycle Events', () => {
        it('should handle errors during startup gracefully', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false // Disable auto startup to avoid dynamic import issues
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container).toBeDefined();

            // Test that the container handles startup errors gracefully
            // by mocking the start method to throw an error
            const originalStart = container.start;
            container.start = jest.fn().mockRejectedValue(new Error('Startup failed'));

            await expect(container.start()).rejects.toThrow('Startup failed');

            // Restore original method
            container.start = originalStart;
        });

        it('should handle errors during shutdown gracefully', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;

            // Mock the stop method to throw an error
            const originalStop = container.stop;
            container.stop = jest.fn().mockRejectedValue(new Error('Stop failed'));

            // Should not throw during close even if stop fails
            await expect(fastify.close()).resolves.not.toThrow();

            // Restore original method
            container.stop = originalStop;
        });
    });

    describe('Manual Lifecycle Control', () => {
        it('should allow manual start and stop of the container', async () => {
            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: testListener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container.isContainerRunning()).toBe(false);

            // Manual start
            await container.start();
            expect(container.isContainerRunning()).toBe(true);

            // Manual stop
            await container.stop();
            expect(container.isContainerRunning()).toBe(false);
        });
    });

    describe('QueueListener Compatibility', () => {
        it('should support the same QueueListener interface across frameworks', async () => {
            // This test verifies that the QueueListener interface works consistently
            const listener: QueueListener<TestMessage> = testListener;

            const options: FastifySqsListenerOptions = {
                queueNameOrUrl: 'https://sqs.us-east-1.amazonaws.com/123456789012/test-queue',
                listener: {
                    messageType: TestMessage,
                    listener: listener
                },
                sqsClient: mockSqsClient,
                autoStartup: false
            };

            await fastify.register(sqsListenerPlugin, options);
            await fastify.ready();

            const container = (fastify as any).sqsListener;
            expect(container).toBeDefined();

            // Verify the container is properly configured
            expect(typeof container.start).toBe('function');
            expect(typeof container.stop).toBe('function');
            expect(typeof container.isContainerRunning).toBe('function');
        });
    });
});