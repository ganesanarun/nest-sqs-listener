import 'reflect-metadata';
import 'dotenv/config';
import {SendMessageCommand, SQSClient} from '@aws-sdk/client-sqs';

/**
 * Test script to send sample messages to SQS queues
 * This demonstrates the logging output with structured data
 */
async function sendTestMessages() {
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

    console.log('Sending test messages...');

    try {
        // Send order created event


        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.ORDER_QUEUE_URL || 'order-events',
            MessageBody: `{
            "orderId": "6cd5b273-6d36-4d90-8fdb-a5d6fa474689",
            "customerId": "800f817a-3c4c-4840-8692-d3afae381cdd",
            "amount": 99,
            "items": [
                {
                    "productId": "PROD-456",
                    "quantity": 2,
                    "price": 29
                },
                {
                    "productId": "PROD-789",
                    "quantity": 1,
                    "price": 39
                }
            ]
        }`
        }));

        console.log('✅ Order message sent');

        // Send notification event
        const notificationMessage = {
            userId: 'user-789',
            type: 'email',
            subject: 'Order Confirmation',
            message: 'This is a test notification message.',
        };

        await sqsClient.send(new SendMessageCommand({
            QueueUrl: process.env.NOTIFICATION_QUEUE_URL || 'notification-events',
            MessageBody: JSON.stringify(notificationMessage)
        }));

        console.log('✅ Notification message sent');
        console.log('\n📋 Messages sent successfully! Check the application logs to see structured data output.');

    } catch (error) {
        console.error('❌ Failed to send messages:', error);
    }
}

// Run the test
sendTestMessages().catch(console.error);