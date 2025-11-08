import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import { PinoOtelLoggerService } from './pino-otel-logger.service';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalLogger = new PinoOtelLoggerService();
  app.useLogger(globalLogger);

  globalLogger.log('Starting SQS Listener Application...');
  globalLogger.log(`AWS Endpoint: ${process.env.AWS_ENDPOINT || 'default'}`);
  globalLogger.log(`AWS Region: ${process.env.AWS_REGION || 'default'}`);

  await app.init();

  globalLogger.log('Application initialized successfully');
  globalLogger.log('SQS listeners are now active and polling for messages');
  globalLogger.log('Press Ctrl+C to stop');

  // Keep the application running
  process.on('SIGINT', async () => {
    globalLogger.log('Received SIGINT, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    globalLogger.log('Received SIGTERM, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch(err => {
  const logger = new PinoOtelLoggerService();
  logger.error('Failed to start application:', { error: err });
  process.exit(1);
});
