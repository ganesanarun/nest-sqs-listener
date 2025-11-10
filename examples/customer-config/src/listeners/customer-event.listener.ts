import { Injectable, Logger } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { CustomerEvent } from '../events/customer.event';
import { CustomerContext } from '../interfaces/customer-context.interface';
import { CustomerResources } from '../interfaces/customer-resources.interface';

@Injectable()
export class CustomerEventListener
  implements QueueListener<CustomerEvent, CustomerContext, CustomerResources>
{
  private readonly logger = new Logger(CustomerEventListener.name);

  async onMessage(
    payload: CustomerEvent,
    context: MessageContext<CustomerContext, CustomerResources>,
  ): Promise<void> {
    const { customerId } = context.getContext()!;
    const { config, rateLimiter } = context.getResources()!;

    this.logger.log(
      `Processing event ${payload.eventId} for ${customerId} (tier: ${config.tier}, rate limit: ${config.rateLimit}/min)`,
    );

    // Apply rate limiting
    await rateLimiter.acquire();

    // Process based on customer tier
    if (config.tier === 'premium') {
      this.logger.log(`Premium processing for ${customerId}`);
    }

    this.logger.log(`Event ${payload.eventId} processed successfully`);
  }
}
