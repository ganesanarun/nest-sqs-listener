import {
    CreateQueueCommand,
    DeleteQueueCommand,
    GetQueueAttributesCommand,
    SendMessageCommand,
    SQSClient,
} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, MessageContext, QueueListener, SqsMessageListenerContainer} from '../src';

/**
 * Integration test for batch acknowledgements.
 *
 * Prerequisites: LocalStack running on localhost:4566
 * Run: docker run --rm -d -p 4566:4566 localstack/localstack:2.3
 */
describe('Batch Acknowledgement - Integration Test', () => {
    let sqsClient: SQSClient;

    jest.setTimeout(60000);

    beforeAll(async () => {
        console.log('🔧 Setting up SQS client...');

        sqsClient = new SQSClient({
            endpoint: 'http://localhost:4566',
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test',
                secretAccessKey: 'test',
            },
        });
    });

    afterAll(async () => {
        if (sqsClient) {
            sqsClient.destroy();
        }
    });

    async function createTestQueue(): Promise<string> {
        const queueName = `batch-test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        const response = await sqsClient.send(
            new CreateQueueCommand({QueueName: queueName})
        );
        return response.QueueUrl!;
    }

    async function deleteTestQueue(queueUrl: string): Promise<void> {
        try {
            await sqsClient.send(new DeleteQueueCommand({QueueUrl: queueUrl}));
        } catch (error) {
            console.warn('Failed to delete queue:', error);
        }
    }

    it('should batch acknowledge exactly 10 messages in a single API call', async () => {
        const queueUrl = await createTestQueue();
        try {
            // ARRANGE
            const messageCount = 10;
            const processedMessages: any[] = [];
            const listener: QueueListener<any> = {
                onMessage: async (payload: any, _context: MessageContext) => {
                    console.log(`📨 Processing message ${payload.id}`);
                    processedMessages.push(payload);
                },
            };
            const container = new SqsMessageListenerContainer<any>(sqsClient);
            container.configure(options => {
                options
                    .queueName(queueUrl)
                    .pollTimeout(2)
                    .maxConcurrentMessages(5)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                    .enableBatchAcknowledgement(true);  // Enable batch acks
            });
            container.setId('batch-ack-test');
            container.setMessageListener(listener);

            // ACT
            console.log(`📤 Sending ${messageCount} messages...`);
            for (let i = 0; i < messageCount; i++) {
                await sqsClient.send(
                    new SendMessageCommand({
                        QueueUrl: queueUrl,
                        MessageBody: JSON.stringify({id: i, data: `Message ${i}`}),
                    })
                );
            }
            console.log('🚀 Starting container...');
            await container.start();
            console.log('⏳ Waiting for messages to be processed...');
            await waitFor(() => processedMessages.length >= messageCount, 20000);
            console.log('🛑 Stopping container...');
            await container.stop();

            // ASSERT
            expect(processedMessages).toHaveLength(messageCount);
            // Verify all messages were deleted from queue
            const queueAttributes = await sqsClient.send(
                new GetQueueAttributesCommand({
                    QueueUrl: queueUrl,
                    AttributeNames: ['ApproximateNumberOfMessages'],
                })
            );
            const messagesInQueue = parseInt(
                queueAttributes.Attributes?.ApproximateNumberOfMessages || '0',
                10
            );
            console.log(`📊 Messages remaining in queue: ${messagesInQueue}`);
            expect(messagesInQueue).toBe(0);
            console.log('✅ Test passed: All messages were batch acknowledged!');
        } finally {
            await deleteTestQueue(queueUrl);
        }
    });

    it('should handle 25 messages with multiple batch flushes', async () => {
        const queueUrl = await createTestQueue();

        try {
            // ARRANGE
            const messageCount = 25; // Will create batches of 10, 10, 5
            const processedMessages: any[] = [];
            const listener: QueueListener<any> = {
                onMessage: async (payload: any, _context: MessageContext) => {
                    processedMessages.push(payload);
                },
            };
            const container = new SqsMessageListenerContainer<any>(sqsClient);
            container.configure(options => {
                options
                    .queueName(queueUrl)
                    .pollTimeout(2)
                    .maxConcurrentMessages(10)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                    .enableBatchAcknowledgement(true);  // Enable batch acks
            });
            container.setId('batch-ack-multi-test');
            container.setMessageListener(listener);

            // ACT
            console.log(`📤 Sending ${messageCount} messages for multi-batch test...`);
            for (let i = 0; i < messageCount; i++) {
                await sqsClient.send(
                    new SendMessageCommand({
                        QueueUrl: queueUrl,
                        MessageBody: JSON.stringify({id: i, data: `Batch message ${i}`}),
                    })
                );
            }
            await container.start();
            await waitFor(() => processedMessages.length >= messageCount, 30000);
            await container.stop();

            // ASSERT
            expect(processedMessages).toHaveLength(messageCount);
            const queueAttributes = await sqsClient.send(
                new GetQueueAttributesCommand({
                    QueueUrl: queueUrl,
                    AttributeNames: ['ApproximateNumberOfMessages'],
                })
            );
            const messagesInQueue = parseInt(
                queueAttributes.Attributes?.ApproximateNumberOfMessages || '0',
                10
            );
            console.log(`📊 Messages after multi-batch: ${messagesInQueue}`);
            expect(messagesInQueue).toBe(0);
            console.log('✅ Multi-batch test passed!');
        } finally {
            await deleteTestQueue(queueUrl);
        }
    });

    it('should flush remaining messages on container stop', async () => {
        const queueUrl = await createTestQueue();

        try {
            // ARRANGE
            const messageCount = 7; // Less than 10, will need shutdown flush
            const processedMessages: any[] = [];
            const listener: QueueListener<any> = {
                onMessage: async (payload: any, _context: MessageContext) => {
                    processedMessages.push(payload);
                },
            };
            const container = new SqsMessageListenerContainer<any>(sqsClient);
            container.configure(options => {
                options
                    .queueName(queueUrl)
                    .pollTimeout(2)
                    .maxConcurrentMessages(5)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                    .enableBatchAcknowledgement(true);  // Enable batch acks
            });
            container.setId('batch-ack-shutdown-test');
            container.setMessageListener(listener);

            // ACT
            console.log(`📤 Sending ${messageCount} messages for shutdown flush test...`);
            for (let i = 0; i < messageCount; i++) {
                await sqsClient.send(
                    new SendMessageCommand({
                        QueueUrl: queueUrl,
                        MessageBody: JSON.stringify({id: i, data: `Shutdown message ${i}`}),
                    })
                );
            }
            await container.start();
            await waitFor(() => processedMessages.length >= messageCount, 20000);
            // Stop should flush remaining batch
            await container.stop();

            // ASSERT
            expect(processedMessages).toHaveLength(messageCount);
            // Give it a moment for async flush
            await new Promise(resolve => setTimeout(resolve, 1000));
            const queueAttributes = await sqsClient.send(
                new GetQueueAttributesCommand({
                    QueueUrl: queueUrl,
                    AttributeNames: ['ApproximateNumberOfMessages'],
                })
            );
            const messagesInQueue = parseInt(
                queueAttributes.Attributes?.ApproximateNumberOfMessages || '0',
                10
            );
            console.log(`📊 Messages after shutdown flush: ${messagesInQueue}`);
            expect(messagesInQueue).toBe(0);
            console.log('✅ Shutdown flush test passed!');
        } finally {
            await deleteTestQueue(queueUrl);
        }
    });
});

async function waitFor(
    condition: () => boolean,
    timeoutMs: number = 10000,
    checkIntervalMs: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
}
