import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  logger.log('Multi-tenant datasource example application started');
  logger.log('Listening for messages on queue: ' + (process.env.QUEUE_NAME || 'tenant-orders'));
  logger.log('Send messages with tenantId and region attributes to see multi-tenant routing in action');

  // Keep the application running
  await app.init();
}

bootstrap();
