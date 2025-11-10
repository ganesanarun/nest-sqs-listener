import { Module } from '@nestjs/common';
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
import { createSqsClient } from '../config/aws.config';
import { CacheDemoListener } from '../listeners/cache-demo.listener';
import { ManagedResource } from '../resources/managed-resource';
import { CacheDemoEvent } from '../events/cache-demo.event';
import { CacheContext } from '../interfaces/cache-context.interface';
import { CacheResources } from '../interfaces/cache-resources.interface';

@Module({
  providers: [
    CacheDemoListener,
    {
      provide: 'CACHE_DEMO_CONTAINER',
      useFactory: (listener: CacheDemoListener) => {
        const sqsClient = createSqsClient();

        const container = new SqsMessageListenerContainer<
          CacheDemoEvent,
          CacheContext,
          CacheResources
        >(sqsClient);

        container.configure((options) => {
          options
            .queueName(process.env.QUEUE_NAME || 'cache-demo')
            .pollTimeout(20)
            .maxConcurrentMessages(5)
            // Extract context from message attributes
            .contextResolver((attributes): CacheContext => {
              const tenantId = attributes['tenantId']?.StringValue;
              const environment = attributes['environment']?.StringValue;

              if (!tenantId || !environment) {
                throw new Error('Missing tenantId or environment attribute');
              }

              if (
                !['production', 'staging', 'development'].includes(environment)
              ) {
                throw new Error('Invalid environment');
              }

              return {
                tenantId,
                environment: environment as CacheContext['environment'],
              };
            })
            // Provide resources (will be cached automatically)
            .resourceProvider(
              async (context: CacheContext): Promise<CacheResources> => {
                const resource = new ManagedResource(context);
                return { resource };
              },
            )
            // Custom cache key generator for efficient caching
            .contextKeyGenerator((context: CacheContext) => {
              // Custom format: tenant:environment
              // More efficient than JSON.stringify
              return `${context.tenantId}:${context.environment}`;
            })
            // Cleanup function called on shutdown for each cached resource
            .resourceCleanup(async (resources: CacheResources) => {
              await resources.resource.cleanup();
            })
            .messageConverter({
              targetClass: CacheDemoEvent,
              enableValidation: true,
            });
        });

        container.setMessageListener(listener);
        container.setId('cache-demo-listener');

        return container;
      },
      inject: [CacheDemoListener],
    },
  ],
})
export class CacheDemoModule {}
