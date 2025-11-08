import { Injectable, Logger } from '@nestjs/common';
import { QueueListenerErrorHandler, MessageContext } from '@snow-tzu/nest-sqs-listener';

@Injectable()
export class CustomErrorHandler implements QueueListenerErrorHandler {
  private readonly logger = new Logger(CustomErrorHandler.name);

  async handleError(error: Error, message: any, context: MessageContext): Promise<void> {
    this.logger.error(`Error processing message ${context.getMessageId()}: ${error.message}`);
    this.logger.error(`Message body: ${JSON.stringify(message)}`);
    this.logger.error(`Receive count: ${context.getApproximateReceiveCount()}`);
    
    // Custom logic based on error type or receive count
    if (context.getApproximateReceiveCount() > 3) {
      this.logger.warn(`Message has been retried ${context.getApproximateReceiveCount()} times, acknowledging to prevent infinite loop`);
      await context.acknowledge();
    }
  }
}
