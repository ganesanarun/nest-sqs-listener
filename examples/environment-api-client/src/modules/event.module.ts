import { Module } from '@nestjs/common';
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
import { createSqsClient } from '../config/aws.config';
import { EventListener } from '../listeners/event.listener';
import { EventService } from '../services/event.service';
import { ConfigService } from '../config/config.service';
import { ApiClient } from '../client/api-client';
import { GenericEvent } from '../events/generic.event';
import { EnvironmentContext } from '../interfaces/environment-context.interface';
import { EnvironmentResources } from '../interfaces/environment-resources.interface';

@Module({
  providers: [
    EventService,
    EventListener,
    ConfigService,
    {
      provide: 'EVENT_LISTENER_CONTAINER',
      useFactory: (
        listener: EventListener,
        configService: ConfigService,
      ) => {
        const sqsClient = createSqsClient();

        const container = new SqsMessageListenerContainer<
          GenericEvent,
          EnvironmentContext,
          EnvironmentResources
        >(sqsClient);

        container.configure((options) => {
          options
            .queueName(process.env.QUEUE_NAME || 'environment-events')
            .pollTimeout(20)
            .maxConcurrentMessages(5)
            // Extract environment context from message attributes
            .contextResolver((attributes): EnvironmentContext => {
              const environment = attributes['environment']?.StringValue;
              const region =
                attributes['region']?.StringValue || 'us-east-1';

              if (
                !environment ||
                !['production', 'staging', 'development'].includes(
                  environment,
                )
              ) {
                throw new Error(
                  'Invalid or missing environment attribute (must be production, staging, or development)',
                );
              }

              return {
                environment: environment as EnvironmentContext['environment'],
                region,
              };
            })
            // Provide environment-specific API client
            .resourceProvider(
              async (
                context: EnvironmentContext,
              ): Promise<EnvironmentResources> => {
                const config = configService.getConfig(
                  context.environment,
                  context.region,
                );
                const apiClient = new ApiClient(config);
                return { apiClient, config };
              },
            )
            // Custom cache key generator
            .contextKeyGenerator((context: EnvironmentContext) => {
              return `${context.environment}:${context.region}`;
            })
            // Cleanup API clients when container stops
            .resourceCleanup(async (resources: EnvironmentResources) => {
              await resources.apiClient.close();
            })
            // Enable validation
            .messageConverter({
              targetClass: GenericEvent,
              enableValidation: true,
            });
        });

        container.setMessageListener(listener);
        container.setId('environment-event-listener');

        return container;
      },
      inject: [EventListener, ConfigService],
    },
  ],
})
export class EventModule {}
