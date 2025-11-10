# Environment-Based API Client Selection Example

This example demonstrates how to use context-based resource selection to route messages to environment-specific API clients (production, staging, development) based on message attributes.

## Overview

This example shows a pattern where:
- Messages contain environment context (environment, region)
- The listener container automatically selects the correct API client
- Different environments use different API endpoints and credentials
- Resources are cached for performance

## What You'll Learn

- How to implement environment-based routing
- How to manage multiple API client configurations
- How to use context resolution for environment selection
- How resource caching works across environments

## Architecture

```
SQS Message with Attributes
  { environment: "production", region: "us-east-1" }
         ↓
Context Resolver extracts EnvironmentContext
  { environment: "production", region: "us-east-1" }
         ↓
Resource Provider selects API Client
  (production endpoint with production credentials)
         ↓
Listener receives typed context + API client
  processes event using environment-specific client
```

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Start LocalStack

```bash
cd ..
docker-compose up -d
cd environment-api-client
```

### 3. Create Queue

```bash
aws sqs create-queue \
  --queue-name environment-events \
  --endpoint-url http://localhost:4566
```

### 4. Configure Environment

```bash
cp .env.example .env
```

## Running the Example

### Start the Application

```bash
npm run start:dev
```

### Send Test Messages

```bash
# Production environment
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/environment-events \
  --message-body '{"eventId":"evt-001","type":"user.created","data":{"userId":"user-123"}}' \
  --message-attributes '{
    "environment": {"DataType":"String","StringValue":"production"},
    "region": {"DataType":"String","StringValue":"us-east-1"}
  }' \
  --endpoint-url http://localhost:4566

# Staging environment
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/environment-events \
  --message-body '{"eventId":"evt-002","type":"user.updated","data":{"userId":"user-456"}}' \
  --message-attributes '{
    "environment": {"DataType":"String","StringValue":"staging"},
    "region": {"DataType":"String","StringValue":"eu-west-1"}
  }' \
  --endpoint-url http://localhost:4566

# Development environment
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/environment-events \
  --message-body '{"eventId":"evt-003","type":"user.deleted","data":{"userId":"user-789"}}' \
  --message-attributes '{
    "environment": {"DataType":"String","StringValue":"development"},
    "region": {"DataType":"String","StringValue":"us-west-2"}
  }' \
  --endpoint-url http://localhost:4566
```

### Expected Output

```
[Nest] LOG   Resources created and cached for key: production:us-east-1
[Nest] LOG   Processing event evt-001 using production API client (https://api.production.example.com)
[Nest] LOG   Resources created and cached for key: staging:eu-west-1
[Nest] LOG   Processing event evt-002 using staging API client (https://api.staging.example.com)
[Nest] LOG   Resources created and cached for key: development:us-west-2
[Nest] LOG   Processing event evt-003 using development API client (https://api.dev.example.com)
```

## Key Files

### `environment-context.interface.ts`

```typescript
export interface EnvironmentContext {
  environment: 'production' | 'staging' | 'development';
  region: string;
}
```

### `environment-resources.interface.ts`

```typescript
export interface EnvironmentResources {
  apiClient: ApiClient;
  config: EnvironmentConfig;
}
```

### `event.module.ts`

```typescript
container.configure((options) => {
  options
    .queueName('environment-events')
    .contextResolver((attributes): EnvironmentContext => {
      const environment = attributes['environment']?.StringValue;
      const region = attributes['region']?.StringValue || 'us-east-1';
      
      if (!environment || !['production', 'staging', 'development'].includes(environment)) {
        throw new Error('Invalid or missing environment attribute');
      }
      
      return { 
        environment: environment as EnvironmentContext['environment'],
        region 
      };
    })
    .resourceProvider(async (context): Promise<EnvironmentResources> => {
      const config = configService.getConfig(context.environment, context.region);
      const apiClient = new ApiClient(config);
      return { apiClient, config };
    });
});
```

## Key Concepts

### Environment-Specific Configuration

Each environment has its own configuration:

```typescript
const configs = {
  production: {
    apiEndpoint: 'https://api.production.example.com',
    apiKey: process.env.PROD_API_KEY,
    timeout: 5000,
  },
  staging: {
    apiEndpoint: 'https://api.staging.example.com',
    apiKey: process.env.STAGING_API_KEY,
    timeout: 10000,
  },
  development: {
    apiEndpoint: 'https://api.dev.example.com',
    apiKey: process.env.DEV_API_KEY,
    timeout: 30000,
  },
};
```

### Type-Safe Environment Selection

TypeScript ensures only valid environments are used:

```typescript
type Environment = 'production' | 'staging' | 'development';

interface EnvironmentContext {
  environment: Environment;
  region: string;
}
```

## Production Considerations

### Secure Credential Management

Use AWS Secrets Manager or Parameter Store:

```typescript
.resourceProvider(async (context): Promise<EnvironmentResources> => {
  const secrets = await secretsManager.getSecret(
    `api-credentials/${context.environment}/${context.region}`
  );
  
  const config = {
    apiEndpoint: secrets.endpoint,
    apiKey: secrets.apiKey,
    timeout: secrets.timeout,
  };
  
  const apiClient = new ApiClient(config);
  return { apiClient, config };
})
```

### Circuit Breaker Pattern

Add circuit breaker for API resilience:

```typescript
const apiClient = new ApiClient(config, {
  circuitBreaker: {
    threshold: 5,
    timeout: 60000,
  },
});
```

### Monitoring

Add metrics for environment-specific processing:

```typescript
this.metricsService.recordApiCall(
  context.environment,
  context.region,
  response.statusCode,
  response.duration
);
```

## Next Steps

- Explore the customer-specific configuration example
- Learn about resource caching and cleanup patterns
- Implement your own environment-based routing

## Additional Resources

- [Main Package Documentation](../../README.md)
- [AWS Secrets Manager](https://aws.amazon.com/secrets-manager/)
- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
