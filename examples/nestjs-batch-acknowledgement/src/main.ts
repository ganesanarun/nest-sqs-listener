import 'reflect-metadata';
import 'dotenv/config';
import {NestFactory} from '@nestjs/core';
import {Logger} from '@nestjs/common';
import {AppModule} from './app.module';

/**
 * NestJS Basic Batch Acknowledgement Example
 *
 * This example demonstrates:
 * - Basic batch acknowledgement configuration
 * - Automatic message batching and flushing
 * - Cost-effective SQS API usage (up to 90% reduction in API calls)
 * - Simple setup with default batch settings
 */
async function bootstrap() {
    const logger = new Logger('Bootstrap');

    logger.log('Starting NestJS Batch Acknowledgement Example...');

    const app = await NestFactory.create(AppModule, {
        logger: ['log', 'error', 'warn', 'debug'],
    });
    await app.init();

    // Graceful shutdown handling - ensures batch acknowledgements are flushed
    const gracefulShutdown = async (signal: string) => {
        logger.log(`Received ${signal}, starting graceful shutdown...`);

        try {
            // This will trigger container.stop() which flushes pending batch acknowledgements
            await app.close();
            logger.log('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            logger.error('Error during graceful shutdown', error);
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    logger.log(`AWS Endpoint: ${process.env.AWS_ENDPOINT || 'default'}`);
    logger.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
    logger.log(`Queue Name: ${process.env.ORDER_QUEUE_NAME || 'order-events-batch'}`);
    logger.log('Application initialized successfully');
    logger.log('SQS listeners are now active and polling for messages');
    logger.log('Batch acknowledgements enabled - messages will be acknowledged in batches of up to 10');
    logger.log('Send test messages to see batching in action!');
}

bootstrap().catch(error => {
    console.error('Failed to start application:', error);
    process.exit(1);
});