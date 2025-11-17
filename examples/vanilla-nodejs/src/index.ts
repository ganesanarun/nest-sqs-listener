import 'reflect-metadata';
import * as dotenv from 'dotenv';
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    AcknowledgementMode,
    JsonPayloadMessagingConverter,
    SqsMessageListenerContainer,
    ValidationFailureMode,
} from '@snow-tzu/sqs-listener';
import {OrderCreatedEvent} from './events/order-created.event';
import {OrderListener} from './listeners/order-listener';
import {CustomLogger} from './logger/custom-logger';

// Load environment variables
dotenv.config();

/**
 * Vanilla Node.js example demonstrating the framework-agnostic core package.
 *
 * This example shows:
 * 1. Manual lifecycle management (start/stop)
 * 2. Custom logger implementation
 * 3. Type-safe message handling
 * 4. Graceful shutdown handling
 * 5. No framework dependencies
 */

const logger = new CustomLogger('Main');

async function main() {
    logger.log('Starting Vanilla Node.js SQS Listener...');

    // Configure AWS SQS Client
    const sqsClient = new SQSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        endpoint: process.env.AWS_ENDPOINT,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
        },
    });

    logger.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    logger.log(`AWS Endpoint: ${process.env.AWS_ENDPOINT || 'default'}`);

    // Create a custom logger for the container
    const containerLogger = new CustomLogger('SqsContainer');

    // Create the SQS message listener container
    const container = new SqsMessageListenerContainer<OrderCreatedEvent>(
        sqsClient,
        containerLogger
    );

    // Configure the container using fluent API
    // Set up a message converter with validation
    const converter = new JsonPayloadMessagingConverter(OrderCreatedEvent, {
        validationFailureMode: ValidationFailureMode.ACKNOWLEDGE,
    });
    container.configure(options => {
        options
            .queueName(process.env.ORDER_QUEUE_NAME || 'order-created-queue')
            .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
            .maxConcurrentMessages(5)
            .messageConverter(converter)
            .visibilityTimeout(30)
            .autoStartup(false); // Manual startup for explicit control
    });

    // Set up message listener
    const listener = new OrderListener();
    container.setMessageListener(listener);

    // Manually start the container
    logger.log('Starting SQS message listener...');
    await container.start();
    logger.log('SQS listener is now active and polling for messages');
    logger.log('Press Ctrl+C to stop');

    // Handle a graceful shutdown
    const shutdown = async (signal: string) => {
        logger.log(`Received ${signal}, shutting down gracefully...`);

        try {
            await container.stop();
            logger.log('Container stopped successfully');
            process.exit(0);
        } catch (error) {
            logger.error('Error during shutdown', (error as Error).stack);
            process.exit(1);
        }
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason, promise) => {
        logger.error(
            `Unhandled Rejection at: ${promise}, reason: ${reason}`,
            reason instanceof Error ? reason.stack : undefined
        );
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error.stack);
        shutdown('uncaughtException');
    });
}

// Start the application
main().catch(error => {
    logger.error('Failed to start application:', error.stack);
    process.exit(1);
});
