import { Module } from '@nestjs/common';
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
import { createSqsClient } from '../config/aws.config';
import { CustomerEventListener } from '../listeners/customer-event.listener';
import { ConfigService } from '../config/config.service';
import { RateLimiter } from '../services/rate-limiter';
import { CustomerEvent } from '../events/customer.event';
import { CustomerContext } from '../interfaces/customer-context.interface';
import { CustomerResources } from '../interfaces/customer-resources.interface';

@Module({
  providers: [
    CustomerEventListener,
    ConfigService,
    {
      provide: 'CUSTOMER_LISTENER_CONTAINER',
      useFactory: (
        listener: CustomerEventListener,
        configService: ConfigService,
      ) => {
        const sqsClient = createSqsClient();

        const container = new SqsMessageListenerContainer<
          CustomerEvent,
          CustomerContext,
          CustomerResources
        >(sqsClient);

        container.configure((options) => {
          options
            .queueName(process.env.QUEUE_NAME || 'customer-events')
            .pollTimeout(20)
            .contextResolver((attributes): CustomerContext => {
              const customerId = attributes['customerId']?.StringValue;
              if (!customerId) {
                throw new Error('Missing customerId attribute');
              }
              return { customerId };
            })
            .resourceProvider(
              async (context: CustomerContext): Promise<CustomerResources> => {
                const config = await configService.getCustomerConfig(
                  context.customerId,
                );
                const rateLimiter = new RateLimiter(config.rateLimit);
                return { config, rateLimiter };
              },
            )
            .resourceCleanup(async (resources: CustomerResources) => {
              await resources.rateLimiter.cleanup();
            })
            .messageConverter({
              targetClass: CustomerEvent,
              enableValidation: true,
            });
        });

        container.setMessageListener(listener);
        container.setId('customer-event-listener');

        return container;
      },
      inject: [CustomerEventListener, ConfigService],
    },
  ],
})
export class CustomerModule {}
