import { Module } from '@nestjs/common';
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
import { createSqsClient } from '../config/aws.config';
import { OrderCreatedListener } from '../listeners/order-created.listener';
import { OrderService } from '../services/order.service';
import { TenantDataSourceManager } from '../datasource/tenant-datasource-manager';
import { OrderCreatedEvent } from '../events/order-created.event';
import { TenantContext } from '../interfaces/tenant-context.interface';
import { TenantResources } from '../interfaces/tenant-resources.interface';

@Module({
  providers: [
    OrderService,
    OrderCreatedListener,
    TenantDataSourceManager,
    {
      provide: 'ORDER_LISTENER_CONTAINER',
      useFactory: (
        listener: OrderCreatedListener,
        dataSourceManager: TenantDataSourceManager,
      ) => {
        const sqsClient = createSqsClient();

        // Create container with generic type parameters for type safety
        const container = new SqsMessageListenerContainer<
          OrderCreatedEvent,
          TenantContext,
          TenantResources
        >(sqsClient);

        // Configure the container
        container.configure((options) => {
          options
            .queueName(process.env.QUEUE_NAME || 'tenant-orders')
            .pollTimeout(20)
            .maxConcurrentMessages(5)
            // Extract tenant context from message attributes
            .contextResolver((attributes): TenantContext => {
              const tenantId = attributes['tenantId']?.StringValue;
              const region = attributes['region']?.StringValue;

              if (!tenantId || !region) {
                throw new Error(
                  'Missing required tenant attributes (tenantId, region)',
                );
              }

              return { tenantId, region };
            })
            // Provide tenant-specific datasource based on context
            .resourceProvider(
              async (context: TenantContext): Promise<TenantResources> => {
                const dataSource = await dataSourceManager.getDataSource(
                  context.tenantId,
                  context.region,
                );
                return { dataSource };
              },
            )
            // Custom cache key generator for better performance
            .contextKeyGenerator((context: TenantContext) => {
              return `${context.tenantId}:${context.region}`;
            })
            // Cleanup datasources when container stops
            .resourceCleanup(async (resources: TenantResources) => {
              await resources.dataSource.destroy();
            })
            // Enable validation for incoming messages
            .messageConverter({
              targetClass: OrderCreatedEvent,
              enableValidation: true,
            });
        });

        // Set the listener
        container.setMessageListener(listener);
        container.setId('tenant-order-listener');

        return container;
      },
      inject: [OrderCreatedListener, TenantDataSourceManager],
    },
  ],
})
export class OrderModule {}
