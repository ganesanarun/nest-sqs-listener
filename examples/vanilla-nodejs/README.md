# Vanilla Node.js Example - Framework-Agnostic SQS Listener

This example demonstrates how to use the `@snow-tzu/sqs-listener` core package in a vanilla Node.js application without any framework dependencies.

## Features Demonstrated

- ✅ Framework-agnostic SQS message consumption
- ✅ Manual lifecycle management (start/stop)
- ✅ Custom logger implementation
- ✅ Type-safe message handling with validation
- ✅ Graceful shutdown handling
- ✅ No NestJS, Express, or other framework dependencies

## Prerequisites

- Node.js 18+ and Yarn
- LocalStack running (for local testing) or AWS account
- Docker (optional, for LocalStack)

## Setup

1. Install dependencies:
```bash
yarn install
```

2. Copy environment configuration:
```bash
cp .env.example .env
```

3. Update `.env` with your AWS/LocalStack configuration

4. Start LocalStack (if testing locally):
```bash
# From the examples directory
docker-compose up -d
```

5. Create the SQS queue:
```bash
# From the examples directory
./scripts/setup-queues.sh
```

## Running the Example

### Development Mode
```bash
yarn start:dev
```

### Production Mode
```bash
yarn build
yarn start:prod
```

## Project Structure

```
src/
├── events/
│   └── order-created.event.ts    # Event payload with validation
├── listeners/
│   └── order-listener.ts         # Message handler implementation
├── logger/
│   └── custom-logger.ts          # Custom logger implementation
└── index.ts                      # Application entry point
```

## Key Concepts

### 1. Custom Logger Implementation

The example includes a custom logger that implements `LoggerInterface`:

```typescript
import { LoggerInterface } from '@snow-tzu/sqs-listener';

export class CustomLogger implements LoggerInterface {
  log(message: string, context?: string): void { /* ... */ }
  error(message: string, trace?: string, context?: string): void { /* ... */ }
  warn(message: string, context?: string): void { /* ... */ }
  debug(message: string, context?: string): void { /* ... */ }
}
```

You can integrate any logging library (Winston, Pino, Bunyan, etc.) by implementing this interface.

### 2. Manual Lifecycle Management

Unlike framework-based examples, you control the container lifecycle explicitly:

```typescript
// Create container
const container = new SqsMessageListenerContainer(sqsClient, logger);

// Configure
container.configure(options => {
  options.queueName('my-queue').autoStartup(false);
});

// Start manually
await container.start();

// Stop when needed
await container.stop();
```

### 3. Graceful Shutdown

The example demonstrates proper cleanup on process termination:

```typescript
process.on('SIGINT', async () => {
  await container.stop();
  process.exit(0);
});
```

## Testing

Send test messages to the queue:

```bash
# From the examples directory
./scripts/send-test-messages.sh
```

You should see colored log output showing message processing.

## Integration with Other Frameworks

This core package can be integrated with any Node.js framework:

- **Express**: See `examples/express`
- **Fastify**: Create container in app lifecycle hooks
- **Koa**: Similar to Express integration
- **AWS Lambda**: Use in Lambda handler initialization

## Comparison with NestJS Adapter

| Feature | Vanilla Node.js (Core) | NestJS Adapter |
|---------|----------------------|----------------|
| Framework dependency | None | NestJS required |
| Lifecycle management | Manual | Automatic (OnModuleInit/Destroy) |
| Dependency injection | Manual | NestJS DI |
| Logger | Custom implementation | NestJS Logger |
| Use case | Any Node.js app | NestJS applications |

## Next Steps

- Explore the Express example for web framework integration
- Check the NestJS adapter for automatic lifecycle management
- Implement custom error handlers
- Add custom message converters
- Integrate with your logging solution

## Resources

- [Core Package Documentation](../../packages/core/README.md)
- [API Reference](../../packages/core/README.md#api-reference)
- [Migration Guide](../migration/README.md)
