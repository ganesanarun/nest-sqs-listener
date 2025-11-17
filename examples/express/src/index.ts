import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { SQSClient } from '@aws-sdk/client-sqs';
import { Server } from 'http';
import { createApp } from './app';
import { SqsManager } from './sqs-manager';

// Load environment variables
dotenv.config();

/**
 * Express.js example demonstrating integration with the framework-agnostic core package.
 * 
 * This example shows:
 * 1. Integration with Express application lifecycle
 * 2. Graceful shutdown handling for both HTTP server and SQS listeners
 * 3. Health check endpoints
 * 4. Proper resource cleanup
 */

const PORT = process.env.PORT || 3000;

async function main() {
  console.log('Starting Express SQS Listener Application...');

  // Configure AWS SQS Client
  const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.AWS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  });

  console.log(`AWS Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`AWS Endpoint: ${process.env.AWS_ENDPOINT || 'default'}`);

  // Create SQS Manager
  const sqsManager = new SqsManager(sqsClient);
  await sqsManager.initialize();

  // Create Express app
  const app = createApp(sqsManager);

  // Start HTTP server
  const server: Server = app.listen(PORT, () => {
    console.log(`Express server listening on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
  });

  // Start SQS listeners
  await sqsManager.start();
  console.log('SQS listeners are now active and polling for messages');
  console.log('Press Ctrl+C to stop');

  // Graceful shutdown handler
  const shutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}, shutting down gracefully...`);

    // Stop accepting new HTTP requests
    server.close(() => {
      console.log('HTTP server closed');
    });

    try {
      // Stop SQS listeners
      await sqsManager.stop();
      console.log('SQS listeners stopped');

      console.log('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Handle shutdown signals
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle uncaught errors
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    shutdown('uncaughtException');
  });
}

// Start the application
main().catch(error => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
