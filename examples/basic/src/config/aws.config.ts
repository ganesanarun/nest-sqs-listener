import { SQSClient } from '@aws-sdk/client-sqs';

export function createSQSClient(): SQSClient {
  const config: any = {
    region: process.env.AWS_REGION || 'us-east-1',
  };

  // Use LocalStack endpoint if configured
  if (process.env.AWS_ENDPOINT) {
    config.endpoint = process.env.AWS_ENDPOINT;
    config.credentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    };
  }

  return new SQSClient(config);
}
