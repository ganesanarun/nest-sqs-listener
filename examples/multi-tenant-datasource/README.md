# Multi-Tenant Datasource Selection Example

This example demonstrates how to use context-based resource selection to route messages to tenant-specific datasources based on message attributes.

## Overview

This example shows a real-world multi-tenant architecture pattern where:
- Each tenant has their own database/datasource
- Message attributes contain tenant context (tenantId, region)
- The listener container automatically resolves the correct datasource
- Resources are cached for performance
- Cleanup happens gracefully on shutdown

## What You'll Learn

- How to define strongly-typed context and resource interfaces
- How to implement a context resolver that extracts tenant information
- How to implement a resource provider that selects tenant-specific datasources
- How resource caching improves performance
- How to implement proper resource cleanup

## Architecture

```
SQS Message with Attributes
  { tenantId: "tenant-123", region: "us-east-1" }
         ↓
Context Resolver extracts TenantContext
  { tenantId: "tenant-123", region: "us-east-1" }
         ↓
Resource Provider selects DataSource
  (checks cache first, creates if needed)
         ↓
Listener receives typed context + datasource
  processes order using tenant-specific database
```

## Prerequisites

- Node.js 18+
- Docker and Docker Compose (for LocalStack)
- Basic understanding of NestJS and TypeScript

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start LocalStack

From the examples directory:

```bash
cd ..
docker-compose up -d
cd multi-tenant-datasource
```

### 3. Create Queue

```bash
aws sqs create-queue \
  --queue-name tenant-orders \
  --endpoint-url http://localhost:4566
```

### 4. Configure Environment

```bash
cp .env.example .env
```

The `.env` file is pre-configured for LocalStack.

## Running the Example

### Start the Application

```bash
npm run start:dev
```

You should see:
```
[Nest] INFO  Starting Nest application...
[Nest] INFO  SqsMessageListenerContainer dependencies initialized
[Nest] LOG   Starting container tenant-order-listener for queue tenant-orders
```

### Send Test Messages

Send messages with different tenant contexts:

```bash
# Tenant A in us-east-1
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/tenant-orders \
  --message-body '{"orderId":"order-001","customerId":"cust-123","amount":99.99}' \
  --message-attributes '{
    "tenantId": {"DataType":"String","StringValue":"tenant-a"},
    "region": {"DataType":"String","StringValue":"us-east-1"}
  }' \
  --endpoint-url http://localhost:4566

# Tenant B in eu-west-1
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/tenant-orders \
  --message-body '{"orderId":"order-002","customerId":"cust-456","amount":149.99}' \
  --message-attributes '{
    "tenantId": {"DataType":"String","StringValue":"tenant-b"},
    "region": {"DataType":"String","StringValue":"eu-west-1"}
  }' \
  --endpoint-url http://localhost:4566

# Another message for Tenant A (cache hit)
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/tenant-orders \
  --message-body '{"orderId":"order-003","customerId":"cust-789","amount":199.99}' \
  --message-attributes '{
    "tenantId": {"DataType":"String","StringValue":"tenant-a"},
    "region": {"DataType":"String","StringValue":"us-east-1"}
  }' \
  --endpoint-url http://localhost:4566
```

### Expected Output

```
[Nest] LOG   Resources created and cached for key: tenant-a:us-east-1
[Nest] LOG   Processing order order-001 for tenant tenant-a using datasource tenant-a-us-east-1-db
[Nest] LOG   Resources created and cached for key: tenant-b:eu-west-1
[Nest] LOG   Processing order order-002 for tenant tenant-b using datasource tenant-b-eu-west-1-db
[Nest] DEBUG Resources retrieved from cache for key: tenant-a:us-east-1
[Nest] LOG   Processing order order-003 for tenant tenant-a using datasource tenant-a-us-east-1-db
```

Notice:
- First message for tenant-a creates and caches the datasource
- Message for tenant-b creates a different datasource
- Third message for tenant-a uses the cached datasource (cache hit)

## Key Files

### `tenant-context.interface.ts`

Defines the strongly-typed context extracted from message attributes:

```typescript
export interface TenantContext {
  tenantId: string;
  region: string;
}
```

### `tenant-resources.interface.ts`

Defines the strongly-typed resources provided to the listener:

```typescript
export interface TenantResources {
  dataSource: TenantDataSource;
}
```

### `tenant-datasource-manager.ts`

Simulates a datasource manager that creates tenant-specific database connections:

```typescript
export class TenantDataSourceManager {
  async getDataSource(tenantId: string, region: string): Promise<TenantDataSource> {
    // In real implementation, this would:
    // - Look up tenant database credentials
    // - Create actual database connection
    // - Return connection pool
    return new TenantDataSource(tenantId, region);
  }
}
```

### `order.module.ts`

Configures the container with context resolver and resource provider:

```typescript
container.configure((options) => {
  options
    .queueName('tenant-orders')
    // Extract tenant context from message attributes
    .contextResolver((attributes): TenantContext => {
      const tenantId = attributes['tenantId']?.StringValue;
      const region = attributes['region']?.StringValue;
      
      if (!tenantId || !region) {
        throw new Error('Missing required tenant attributes');
      }
      
      return { tenantId, region };
    })
    // Provide tenant-specific datasource
    .resourceProvider(async (context: TenantContext): Promise<TenantResources> => {
      const dataSource = await dataSourceManager.getDataSource(
        context.tenantId,
        context.region
      );
      return { dataSource };
    })
    // Custom cache key generator for better performance
    .contextKeyGenerator((context: TenantContext) => {
      return `${context.tenantId}:${context.region}`;
    })
    // Cleanup datasources on shutdown
    .resourceCleanup(async (resources: TenantResources) => {
      await resources.dataSource.destroy();
    });
});
```

### `order-created.listener.ts`

Listener with strongly-typed access to context and resources:

```typescript
export class OrderCreatedListener implements QueueListener<
  OrderCreatedEvent,
  TenantContext,
  TenantResources
> {
  async onMessage(
    payload: OrderCreatedEvent,
    context: MessageContext<TenantContext, TenantResources>
  ): Promise<void> {
    // Get typed context and resources
    const { tenantId, region } = context.getContext()!;
    const { dataSource } = context.getResources()!;
    
    // Use tenant-specific datasource
    await this.orderService.processOrder(payload, tenantId, dataSource);
  }
}
```

## Key Concepts

### Context Resolution

The context resolver extracts tenant information from SQS message attributes:

```typescript
.contextResolver((attributes): TenantContext => {
  const tenantId = attributes['tenantId']?.StringValue;
  const region = attributes['region']?.StringValue;
  
  if (!tenantId || !region) {
    throw new Error('Missing required tenant attributes');
  }
  
  return { tenantId, region };
})
```

If context resolution fails:
- Error is logged with message attributes
- Error handler is invoked
- Message is not processed
- Acknowledgement is handled based on mode

### Resource Provisioning

The resource provider creates or retrieves tenant-specific datasources:

```typescript
.resourceProvider(async (context: TenantContext): Promise<TenantResources> => {
  const dataSource = await dataSourceManager.getDataSource(
    context.tenantId,
    context.region
  );
  return { dataSource };
})
```

Resources are automatically cached by context key to avoid redundant initialization.

### Cache Key Generation

Custom cache key generator for efficient caching:

```typescript
.contextKeyGenerator((context: TenantContext) => {
  return `${context.tenantId}:${context.region}`;
})
```

Without a custom generator, `JSON.stringify(context)` is used as the default.

### Resource Cleanup

Cleanup function ensures proper resource disposal on shutdown:

```typescript
.resourceCleanup(async (resources: TenantResources) => {
  await resources.dataSource.destroy();
})
```

This is called automatically when the container stops.

## Type Safety

The example demonstrates full TypeScript type safety:

```typescript
// Container knows about all three types
const container = new SqsMessageListenerContainer<
  OrderCreatedEvent,    // Payload type
  TenantContext,        // Context type
  TenantResources       // Resources type
>(sqsClient);

// Listener must match container types
class OrderCreatedListener implements QueueListener<
  OrderCreatedEvent,
  TenantContext,
  TenantResources
> {
  async onMessage(
    payload: OrderCreatedEvent,  // Typed payload
    context: MessageContext<TenantContext, TenantResources>  // Typed context
  ): Promise<void> {
    // TypeScript knows the shape of context and resources
    const { tenantId } = context.getContext()!;  // TenantContext
    const { dataSource } = context.getResources()!;  // TenantResources
  }
}
```

## Error Handling

### Missing Tenant Attributes

If a message arrives without required tenant attributes:

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/tenant-orders \
  --message-body '{"orderId":"order-999","customerId":"cust-999","amount":99.99}' \
  --endpoint-url http://localhost:4566
```

Output:
```
[Nest] ERROR Context resolution failed for message <message-id>
[Nest] ERROR Missing required tenant attributes
```

The message is not processed and error handler is invoked.

### Datasource Initialization Failure

If datasource creation fails, the error is caught and handled:

```
[Nest] ERROR Resource provisioning failed for message <message-id>
[Nest] ERROR Failed to connect to tenant database
```

## Production Considerations

### Real Datasource Implementation

In production, replace the simulated datasource with real database connections:

```typescript
export class TenantDataSourceManager {
  async getDataSource(tenantId: string, region: string): Promise<DataSource> {
    // Look up tenant database credentials from config service
    const config = await this.configService.getTenantDbConfig(tenantId, region);
    
    // Create TypeORM datasource
    const dataSource = new DataSource({
      type: 'postgres',
      host: config.host,
      port: config.port,
      username: config.username,
      password: config.password,
      database: config.database,
      // Connection pooling
      extra: {
        max: 10,
        min: 2,
      },
    });
    
    await dataSource.initialize();
    return dataSource;
  }
}
```

### Cache Eviction

For long-running applications, consider implementing cache eviction:

```typescript
// Add TTL-based eviction
.resourceProvider(async (context: TenantContext): Promise<TenantResources> => {
  const dataSource = await dataSourceManager.getDataSource(
    context.tenantId,
    context.region,
    { ttl: 3600000 } // 1 hour TTL
  );
  return { dataSource };
})
```

### Health Checks

Implement periodic health checks for cached datasources:

```typescript
.resourceProvider(async (context: TenantContext): Promise<TenantResources> => {
  const dataSource = await dataSourceManager.getDataSource(
    context.tenantId,
    context.region
  );
  
  // Verify connection is healthy
  await dataSource.query('SELECT 1');
  
  return { dataSource };
})
```

### Monitoring

Add metrics for cache performance:

```typescript
.contextKeyGenerator((context: TenantContext) => {
  const key = `${context.tenantId}:${context.region}`;
  this.metricsService.recordCacheKeyGeneration(key);
  return key;
})
```

## Troubleshooting

### Messages not routing to correct datasource

**Check:**
- Message attributes are set correctly
- Context resolver extracts correct values
- Cache key generator produces unique keys per tenant

### Datasources not being cleaned up

**Check:**
- Resource cleanup function is configured
- Container stop() is called on shutdown
- Cleanup function handles errors gracefully

### Performance issues with many tenants

**Consider:**
- Implementing cache eviction policy
- Using connection pooling
- Monitoring cache size and hit rate

## Next Steps

- Explore the environment-based API client example
- Learn about customer-specific configuration patterns
- Implement your own multi-tenant architecture

## Additional Resources

- [Main Package Documentation](../../README.md)
- [TypeORM Documentation](https://typeorm.io/)
- [AWS SQS Message Attributes](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-message-metadata.html)
