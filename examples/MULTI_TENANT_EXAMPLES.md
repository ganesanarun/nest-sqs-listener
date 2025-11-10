# Multi-Tenant SQS Listener Examples

This directory contains examples demonstrating the multi-tenant and context-based resource selection features of `@snow-tzu/nest-sqs-listener`.

## Overview

These examples show how to use the new context resolution and resource provisioning features to build sophisticated multi-tenant architectures where different messages are routed to different resources based on message attributes.

## Examples

### 1. Multi-Tenant Datasource Selection

**Path:** `./multi-tenant-datasource`

**Use Case:** Route messages to tenant-specific databases based on tenant ID and region.

**Key Features:**
- Tenant context extraction from message attributes
- Automatic datasource selection and caching
- Type-safe context and resource access
- Proper resource cleanup on shutdown

**Best For:** Multi-tenant SaaS applications where each tenant has their own database.

[View Example →](./multi-tenant-datasource)

---

### 2. Environment-Based API Client Selection

**Path:** `./environment-api-client`

**Use Case:** Route messages to environment-specific API endpoints (production, staging, development).

**Key Features:**
- Environment context extraction
- Environment-specific API client configuration
- Different timeouts and credentials per environment
- Resource caching and cleanup

**Best For:** Applications that need to interact with different API environments based on message context.

[View Example →](./environment-api-client)

---

### 3. Customer-Specific Configuration

**Path:** `./customer-config`

**Use Case:** Apply customer-specific rate limits, features, and processing rules.

**Key Features:**
- Customer context extraction
- Customer tier-based configuration (premium, standard, trial)
- Rate limiting per customer
- Feature flag support

**Best For:** Applications with different customer tiers and per-customer configuration.

[View Example →](./customer-config)

---

### 4. Resource Caching and Cleanup

**Path:** `./resource-caching`

**Use Case:** Demonstrate advanced caching patterns and proper resource lifecycle management.

**Key Features:**
- Custom cache key generation
- Cache hit/miss logging
- Resource usage tracking
- Graceful shutdown with cleanup
- Cache performance monitoring

**Best For:** Understanding how resource caching works and implementing production-ready cleanup strategies.

[View Example →](./resource-caching)

---

## Quick Start

Each example can be run independently:

```bash
# Navigate to an example
cd multi-tenant-datasource

# Install dependencies
npm install

# Start LocalStack (from examples directory)
cd .. && docker-compose up -d && cd multi-tenant-datasource

# Create queue
aws sqs create-queue --queue-name <queue-name> --endpoint-url http://localhost:4566

# Run the example
npm run start:dev

# Send test messages (see each example's README)
```

## Common Patterns

### Context Resolution

All examples extract context from SQS message attributes:

```typescript
.contextResolver((attributes): Context => {
  const value = attributes['key']?.StringValue;
  if (!value) throw new Error('Missing required attribute');
  return { value };
})
```

### Resource Provisioning

All examples provide resources based on context:

```typescript
.resourceProvider(async (context): Promise<Resources> => {
  const resource = await createResource(context);
  return { resource };
})
```

### Cache Key Generation

Most examples use custom cache key generators:

```typescript
.contextKeyGenerator((context) => {
  return `${context.key1}:${context.key2}`;
})
```

### Resource Cleanup

All examples implement proper cleanup:

```typescript
.resourceCleanup(async (resources) => {
  await resources.resource.cleanup();
})
```

## Type Safety

All examples demonstrate full TypeScript type safety:

```typescript
// Container with generic types
const container = new SqsMessageListenerContainer<
  PayloadType,
  ContextType,
  ResourcesType
>(sqsClient);

// Listener with matching types
class Listener implements QueueListener<
  PayloadType,
  ContextType,
  ResourcesType
> {
  async onMessage(
    payload: PayloadType,
    context: MessageContext<ContextType, ResourcesType>
  ): Promise<void> {
    const ctx = context.getContext()!;  // ContextType
    const res = context.getResources()!;  // ResourcesType
  }
}
```

## Architecture Patterns

### Single Dimension Context

Simple context with one key:

```typescript
interface Context {
  tenantId: string;
}
```

### Multi-Dimension Context

Complex context with multiple keys:

```typescript
interface Context {
  tenantId: string;
  region: string;
  environment: string;
}
```

### Simple Resources

Single resource:

```typescript
interface Resources {
  dataSource: DataSource;
}
```

### Complex Resources

Multiple related resources:

```typescript
interface Resources {
  dataSource: DataSource;
  apiClient: ApiClient;
  config: Config;
  rateLimiter: RateLimiter;
}
```

## Production Considerations

### Security

- Store credentials in AWS Secrets Manager or Parameter Store
- Use IAM roles instead of access keys
- Implement proper authentication for resources

### Performance

- Implement cache eviction policies (TTL, LRU)
- Monitor cache hit rates
- Use efficient cache key generation
- Consider connection pooling

### Reliability

- Implement health checks for cached resources
- Handle resource initialization failures gracefully
- Implement retry logic for transient failures
- Monitor resource creation and cleanup

### Observability

- Log cache hits and misses
- Track resource creation time
- Monitor cache size
- Alert on cleanup failures
- Track resource usage patterns

## Testing

Each example can be tested with LocalStack:

```bash
# Start LocalStack
docker-compose up -d

# Create queue
aws sqs create-queue --queue-name <queue-name> --endpoint-url http://localhost:4566

# Send test message with attributes
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/<queue-name> \
  --message-body '{"key":"value"}' \
  --message-attributes '{
    "attribute1":{"DataType":"String","StringValue":"value1"},
    "attribute2":{"DataType":"String","StringValue":"value2"}
  }' \
  --endpoint-url http://localhost:4566
```

## Next Steps

1. **Start with Resource Caching** - Understand the fundamentals
2. **Try Multi-Tenant Datasource** - See a real-world pattern
3. **Explore Environment-Based** - Learn about environment routing
4. **Study Customer Config** - Understand per-customer customization
5. **Build Your Own** - Apply patterns to your use case

## Additional Resources

- [Main Package Documentation](../README.md)
- [Basic Examples](./basic)
- [Advanced Examples](./advanced)
- [Validation Examples](./VALIDATION_EXAMPLES.md)

## Support

For questions or issues:
1. Check the example READMEs
2. Review the main package documentation
3. Open an issue on GitHub
