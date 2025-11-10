# Customer-Specific Configuration Example

This example demonstrates how to use context-based resource selection to load customer-specific configurations and apply customer-specific processing rules based on message attributes.

## Overview

- Messages contain customer context (customerId)
- The listener container automatically loads customer configuration
- Different customers have different rate limits, features, and settings
- Resources are cached for performance

## Quick Start

```bash
npm install
cp .env.example .env

# Start LocalStack
cd .. && docker-compose up -d && cd customer-config

# Create queue
aws sqs create-queue --queue-name customer-events --endpoint-url http://localhost:4566

# Run application
npm run start:dev

# Send test message
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/customer-events \
  --message-body '{"eventId":"evt-001","action":"process","data":{}}' \
  --message-attributes '{"customerId":{"DataType":"String","StringValue":"customer-premium"}}' \
  --endpoint-url http://localhost:4566
```

## Key Concepts

### Customer Context

```typescript
export interface CustomerContext {
  customerId: string;
}
```

### Customer Resources

```typescript
export interface CustomerResources {
  config: CustomerConfig;
  rateLimiter: RateLimiter;
}
```

### Configuration

```typescript
container.configure((options) => {
  options
    .contextResolver((attributes): CustomerContext => {
      const customerId = attributes['customerId']?.StringValue;
      if (!customerId) throw new Error('Missing customerId');
      return { customerId };
    })
    .resourceProvider(async (context): Promise<CustomerResources> => {
      const config = await configService.getCustomerConfig(context.customerId);
      const rateLimiter = new RateLimiter(config.rateLimit);
      return { config, rateLimiter };
    });
});
```

## Customer Tiers

### Premium Customer
- Rate limit: 1000 requests/minute
- Features: advanced analytics, priority support
- Processing priority: high

### Standard Customer
- Rate limit: 100 requests/minute
- Features: basic analytics
- Processing priority: normal

### Trial Customer
- Rate limit: 10 requests/minute
- Features: limited
- Processing priority: low

## Testing Different Customers

```bash
# Premium customer
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/customer-events \
  --message-body '{"eventId":"evt-001","action":"process","data":{}}' \
  --message-attributes '{"customerId":{"DataType":"String","StringValue":"customer-premium"}}' \
  --endpoint-url http://localhost:4566

# Standard customer
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/customer-events \
  --message-body '{"eventId":"evt-002","action":"process","data":{}}' \
  --message-attributes '{"customerId":{"DataType":"String","StringValue":"customer-standard"}}' \
  --endpoint-url http://localhost:4566

# Trial customer
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/customer-events \
  --message-body '{"eventId":"evt-003","action":"process","data":{}}' \
  --message-attributes '{"customerId":{"DataType":"String","StringValue":"customer-trial"}}' \
  --endpoint-url http://localhost:4566
```

## Expected Output

```
[Nest] LOG   Resources created and cached for key: customer-premium
[Nest] LOG   Processing event evt-001 for customer-premium (tier: premium, rate limit: 1000/min)
[Nest] LOG   Resources created and cached for key: customer-standard
[Nest] LOG   Processing event evt-002 for customer-standard (tier: standard, rate limit: 100/min)
[Nest] LOG   Resources created and cached for key: customer-trial
[Nest] LOG   Processing event evt-003 for customer-trial (tier: trial, rate limit: 10/min)
```

## Production Considerations

### Dynamic Configuration Loading

Load from database or config service:

```typescript
.resourceProvider(async (context): Promise<CustomerResources> => {
  const config = await database.query(
    'SELECT * FROM customer_configs WHERE customer_id = $1',
    [context.customerId]
  );
  
  const rateLimiter = new RateLimiter(config.rateLimit);
  return { config, rateLimiter };
})
```

### Rate Limiting

Implement real rate limiting:

```typescript
export class RateLimiter {
  async acquire(): Promise<void> {
    const allowed = await redis.checkRateLimit(
      this.customerId,
      this.limit,
      this.window
    );
    
    if (!allowed) {
      throw new RateLimitExceededError();
    }
  }
}
```

### Feature Flags

Check customer features:

```typescript
if (config.features.includes('advanced-analytics')) {
  await this.analyticsService.trackAdvanced(event);
}
```

## Additional Resources

- [Main Package Documentation](../../README.md)
- [Rate Limiting Patterns](https://en.wikipedia.org/wiki/Rate_limiting)
