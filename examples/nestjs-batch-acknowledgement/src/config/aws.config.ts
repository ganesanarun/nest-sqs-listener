import {SQSClient} from '@aws-sdk/client-sqs';

/**
 * Creates and configures the SQS client for batch acknowledgement example.
 *
 * Supports both LocalStack (local testing) and AWS (production) configurations.
 */
export function createSQSClient(): SQSClient {
    return new SQSClient({
        region: process.env.AWS_REGION || 'us-east-1',
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
        },
        // Use LocalStack endpoint if provided, otherwise use default AWS endpoint
        ...(process.env.AWS_ENDPOINT && {
            endpoint: process.env.AWS_ENDPOINT,
        }),
    });
}