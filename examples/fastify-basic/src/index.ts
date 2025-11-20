import 'reflect-metadata';
import 'dotenv/config';
import Fastify from 'fastify';
import {SQSClient} from '@aws-sdk/client-sqs';
import {sqsListenerPlugin,ValidationFailureMode} from '@snow-tzu/fastify-sqs-listener';

// Import events
import {OrderCreatedEvent} from './events/order-created.event';
import {NotificationEvent} from './events/notification.event';

// Import listeners
import {OrderCreatedListener} from './listeners/order-created.listener';
import {NotificationListener} from './listeners/notification.listener';

// Import services
import {OrderService} from './services/order.service';
import {NotificationService} from './services/notification.service';

// Import decorators
import {TraceListenerDecorator} from './decorators/trace-listener.decorator';

/**
 * Fastify SQS Listener Basic Example
 *
 * This example demonstrates:
 * - Single listener approach with multiple plugin registrations
 * - TypeScript usage with message validation
 * - Composable decorator pattern for cross-cutting concerns
 * - Separation of concerns with services
 * - Multiple message types handled through separate plugin registrations
 */
async function bootstrap() {
    // Create a Fastify instance with logging
    const fastify = Fastify({
        logger: {
            level: process.env.LOG_LEVEL || 'debug',
            transport: {
                target: 'pino-pretty',
                options: {
                    colorize: true,
                    translateTime: 'HH:MM:ss Z',
                    ignore: 'pid,hostname'
                }
            }
        }
    });

    // Configure AWS SQS Client
    const sqsClient = new SQSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test'
        },
        ...(process.env.AWS_ENDPOINT && {
            endpoint: process.env.AWS_ENDPOINT
        })
    });

    // Create services
    const orderService = new OrderService(fastify.log);
    const notificationService = new NotificationService(fastify.log);

    // Create base listeners
    const orderListener = new OrderCreatedListener(orderService, fastify.log);
    const notificationListener = new NotificationListener(notificationService, fastify.log);

    // Wrap listeners with decorators to demonstrate a composable pattern
    const tracedOrderListener = new TraceListenerDecorator(orderListener, fastify.log);

    const tracedNotificationListener = new TraceListenerDecorator(
        notificationListener,
        fastify.log
    );

    // Register SQS listener plugin for order events
    // Each plugin registration handles a single message type with a single listener
    await fastify.register(sqsListenerPlugin, {
        queueNameOrUrl: process.env.ORDER_QUEUE_URL || 'order-events',
        listener: {
            messageType: OrderCreatedEvent,
            listener: tracedOrderListener
        },
        sqsClient,
        autoStartup: true,
        maxConcurrentMessages: 5,
        enableValidation: true,
        validationFailureMode: ValidationFailureMode.THROW,
        containerId: 'order-processor'
    });

    // Register separate plugin for notification events
    // This demonstrates the single listener approach - each plugin registration
    // creates an independent SQS container for handling one message type
    await fastify.register(sqsListenerPlugin, {
        queueNameOrUrl: process.env.NOTIFICATION_QUEUE_URL || 'notification-events',
        listener: {
            messageType: NotificationEvent,
            listener: tracedNotificationListener
        },
        sqsClient,
        autoStartup: true,
        maxConcurrentMessages: 3,
        enableValidation: true,
        containerId: 'notification-processor'
    });

    // Add health check endpoint
    fastify.get('/health', async (request, reply) => {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            environment: {
                nodeVersion: process.version,
                platform: process.platform,
                arch: process.arch
            }
        };
    });

    // Add SQS listener status endpoint
    fastify.get('/status', async (request, reply) => {
        // With multiple plugin registrations, each creates its own container
        // The status endpoint shows information about all registered containers
        return {
            containers: {
                orderProcessor: {
                    containerId: 'order-processor',
                    queue: process.env.ORDER_QUEUE_URL || 'order-events',
                    messageType: 'OrderCreatedEvent'
                },
                notificationProcessor: {
                    containerId: 'notification-processor',
                    queue: process.env.NOTIFICATION_QUEUE_URL || 'notification-events',
                    messageType: 'NotificationEvent'
                }
            },
            queues: {
                orderQueue: process.env.ORDER_QUEUE_URL || 'order-events',
                notificationQueue: process.env.NOTIFICATION_QUEUE_URL || 'notification-events'
            }
        };
    });

    // Graceful shutdown handling
    const gracefulShutdown = async (signal: string) => {
        fastify.log.info(`Received ${signal}, starting graceful shutdown...`);

        try {
            await fastify.close();
            fastify.log.info('Graceful shutdown completed');
            process.exit(0);
        } catch (error) {
            fastify.log.error('Error during graceful shutdown');
            process.exit(1);
        }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Start the server
    try {
        const port = parseInt(process.env.PORT || '3000', 10);
        await fastify.listen({port, host: '0.0.0.0'});

        fastify.log.info('🚀 Fastify SQS Listener Example started successfully');
        fastify.log.info('📋 Available endpoints:');
        fastify.log.info('   GET /health - Health check');
        fastify.log.info('   GET /status - SQS containers status');
        fastify.log.info('🔄 Multiple SQS containers registered:');
        fastify.log.info('   - Order processor: handling OrderCreatedEvent messages');
        fastify.log.info('   - Notification processor: handling NotificationEvent messages');

    } catch (error) {
        fastify.log.error('Failed to start server');
        process.exit(1);
    }
}

// Start the application
bootstrap().catch((error) => {
    console.error('Failed to bootstrap application:', error);
    process.exit(1);
});