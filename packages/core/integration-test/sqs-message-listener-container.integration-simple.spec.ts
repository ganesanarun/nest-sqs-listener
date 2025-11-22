import {
    CreateQueueCommand,
    DeleteQueueCommand,
    GetQueueAttributesCommand,
    SendMessageCommand,
    SQSClient,
} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, MessageContext, QueueListener, SqsMessageListenerContainer} from '../src';

/**
 * Simple integration test that assumes LocalStack is already running locally.
 *
 * To run this test:
 * 1. Start LocalStack: docker run --rm -d -p 4566:4566 localstack/localstack:2.3
 * 2. Run test: yarn test test/container/sqs-message-listener-container.integration-simple.spec.ts
 */
describe('SqsMessageListenerContainer - Simple Integration Test', () => {
    let sqsClient: SQSClient;
    let queueUrl: string;
    const queueName = `test-queue-${Date.now()}`;

    // Longer timeout for integration tests
    jest.setTimeout(30000);

    beforeAll(async () => {
        console.log('Connecting to LocalStack at localhost:4566...');

        // Create an SQS client pointing to localhost LocalStack
        sqsClient = new SQSClient({
            endpoint: 'http://localhost:4566',
            region: 'us-east-1',
            credentials: {
                accessKeyId: 'test',
                secretAccessKey: 'test',
            },
        });

        try {
            // Create queue
            const createQueueResponse = await sqsClient.send(
                new CreateQueueCommand({
                    QueueName: queueName,
                })
            );

            queueUrl = createQueueResponse.QueueUrl!;
            console.log('Queue created:', queueUrl);
        } catch (error) {
            console.error('Failed to create queue. Is LocalStack running on localhost:4566?');
            throw error;
        }
    });

    afterAll(async () => {
        // Cleanup
        if (queueUrl) {
            try {
                await sqsClient.send(
                    new DeleteQueueCommand({
                        QueueUrl: queueUrl,
                    })
                );
                console.log('Queue deleted:', queueUrl);
            } catch (error) {
                console.warn('Failed to delete queue:', error);
            }
        }
        if (sqsClient) {
            sqsClient.destroy();
        }
    });

    it('should process a message from SQS queue end-to-end', async () => {
        // ARRANGE
        interface TestMessage {
            orderId: string;
            amount: number;
        }

        const processedMessages: TestMessage[] = [];
        const messageToSend = {orderId: '12345', amount: 100};

        // Create listener that captures processed messages
        const listener: QueueListener<TestMessage> = {
            onMessage: jest.fn().mockImplementation(async (payload: TestMessage, context: MessageContext) => {
                console.log('✅ Processing message:', payload);
                processedMessages.push(payload);
            }),
        };

        // Create and configure container
        const container = new SqsMessageListenerContainer<TestMessage>(sqsClient);
        container.configure(options => {
            options
                .queueName(queueUrl)
                .pollTimeout(5)
                .maxConcurrentMessages(1)
                .autoStartup(false)
                .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
        });

        container.setId('integration-test-container');
        container.setMessageListener(listener);

        // ACT
        // Send message to queue
        console.log('📤 Sending message to queue...');
        await sqsClient.send(
            new SendMessageCommand({
                QueueUrl: queueUrl,
                MessageBody: JSON.stringify(messageToSend),
            })
        );

        // Start container
        console.log('🚀 Starting container...');
        await container.start();

        // Wait for message to be processed
        console.log('⏳ Waiting for message to be processed...');
        await waitFor(() => processedMessages.length > 0, 15000);

        // Stop container
        console.log('🛑 Stopping container...');
        await container.stop();

        // ASSERT
        expect(processedMessages).toHaveLength(1);
        expect(processedMessages[0]).toEqual(messageToSend);
        expect(listener.onMessage).toHaveBeenCalledTimes(1);
        expect(listener.onMessage).toHaveBeenCalledWith(
            messageToSend,
            expect.objectContaining({
                acknowledge: expect.any(Function),
            })
        );

        // Verify message was deleted from queue
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
        console.log('📊 Messages remaining in queue:', messagesInQueue);
        expect(messagesInQueue).toBe(0);

        console.log('✅ Test passed!');
    });
});

/**
 * Helper function to wait for a condition with timeout
 */
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
