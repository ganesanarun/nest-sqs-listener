import { SQSClient } from '@aws-sdk/client-sqs';

export function createOrderSQSClient(): SQSClient {
  const config: any = {
    region: process.env.ORDER_AWS_REGION || 'us-east-1',
  };

  // Use LocalStack endpoint if configured
  if (process.env.ORDER_AWS_ENDPOINT) {
    config.endpoint = process.env.ORDER_AWS_ENDPOINT;
    config.credentials = {
      accessKeyId: process.env.ORDER_AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.ORDER_AWS_SECRET_ACCESS_KEY || 'test',
    };
  }

  return new SQSClient(config);
}

export function createNotificationSQSClient(): SQSClient {
  const config: any = {
    region: process.env.NOTIFICATION_AWS_REGION || 'us-east-1',
  };

  // Use LocalStack endpoint if configured
  if (process.env.NOTIFICATION_AWS_ENDPOINT) {
    config.endpoint = process.env.NOTIFICATION_AWS_ENDPOINT;
    config.credentials = {
      accessKeyId: process.env.NOTIFICATION_AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.NOTIFICATION_AWS_SECRET_ACCESS_KEY || 'test',
    };
  }

  return new SQSClient(config);
}
