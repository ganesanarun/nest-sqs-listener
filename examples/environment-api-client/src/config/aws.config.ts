import { SQSClient } from '@aws-sdk/client-sqs';

/**
 * Create and configure AWS SQS client.
 */
export function createSqsClient(): SQSClient {
  const config: any = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    };
  }

  if (process.env.AWS_ENDPOINT) {
    config.endpoint = process.env.AWS_ENDPOINT;
  }

  return new SQSClient(config);
}
