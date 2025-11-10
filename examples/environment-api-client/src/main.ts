import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  logger.log('Environment-based API client example application started');
  logger.log('Listening for messages on queue: ' + (process.env.QUEUE_NAME || 'environment-events'));
  logger.log('Send messages with environment and region attributes to see environment-based routing');

  await app.init();
}

bootstrap();
