# Express.js Example - Framework-Agnostic SQS Listener

This example demonstrates how to integrate the `@snow-tzu/sqs-listener` core package with an Express.js application.

## Features Demonstrated

- ✅ Integration with Express application lifecycle
- ✅ Graceful shutdown for both HTTP server and SQS listeners
- ✅ Health check endpoints
- ✅ Multiple SQS listeners management
- ✅ Proper resource cleanup
- ✅ Type-safe message handling with validation

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

The server will start on `http://localhost:3000` (or the port specified in `.env`).

## API Endpoints

### Health Check
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "express-sqs-listener"
}
```

### Status
```bash
curl http://localhost:3000/status
```

Response:
```json
{
  "status": "running",
  "listeners": "active",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Project Structure

```
src/
├── events/
│   └── order-created.event.ts    # Event payload with validation
├── listeners/
│   └── order-listener.ts         # Message handler implementation
├── app.ts                        # Express app configuration
├── sqs-manager.ts                # SQS listeners lifecycle manager
└── index.ts                      # Application entry point
```

## Key Concepts

### 1. SQS Manager Pattern

The `SqsManager` class encapsulates all SQS listener lifecycle management:

```typescript
export class SqsManager {
  async initialize(): Promise<void> { /* Create containers */ }
  async start(): Promise<void> { /* Start all listeners */ }
  async stop(): Promise<void> { /* Stop all listeners */ }
}
```

This pattern allows you to:
- Manage multiple SQS listeners centrally
- Start/stop all listeners together
- Integrate cleanly with Express lifecycle

### 2. Graceful Shutdown

The example demonstrates proper shutdown handling for both HTTP and SQS:

```typescript
const shutdown = async (signal: string) => {
  // 1. Stop accepting new HTTP requests
  server.close();
  
  // 2. Stop SQS listeners (finish processing current messages)
  await sqsManager.stop();
  
  // 3. Exit
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
```

### 3. Health Checks

Health check endpoints are useful for:
- Load balancer health checks
- Kubernetes liveness/readiness probes
- Monitoring systems

### 4. Multiple Listeners

You can easily add more listeners in `SqsManager`:

```typescript
private createNotificationListener(): SqsMessageListenerContainer<NotificationEvent> {
  const container = new SqsMessageListenerContainer(/* ... */);
  // Configure...
  return container;
}

async initialize(): Promise<void> {
  this.containers.push(this.createOrderListener());
  this.containers.push(this.createNotificationListener());
}
```

## Testing

1. Start the application:
```bash
yarn start:dev
```

2. In another terminal, send test messages:
```bash
# From the examples directory
./scripts/send-test-messages.sh
```

3. Check the application logs to see message processing

4. Test health endpoint:
```bash
curl http://localhost:3000/health
```

## Production Considerations

### 1. Error Handling

Add custom error handlers for better error management:

```typescript
import { DefaultQueueListenerErrorHandler } from '@snow-tzu/sqs-listener';

const errorHandler = new DefaultQueueListenerErrorHandler(logger);
container.setErrorHandler(errorHandler);
```

### 2. Monitoring

Integrate with monitoring tools:
- Add metrics endpoints (Prometheus)
- Send logs to centralized logging (CloudWatch, ELK)
- Track message processing times

### 3. Configuration

Use environment-specific configuration:
- Different queue names per environment
- Adjust concurrency based on load
- Configure visibility timeouts appropriately

### 4. Scaling

- Run multiple instances behind a load balancer
- Each instance will poll SQS independently
- SQS handles message distribution automatically

## Comparison with Other Approaches

| Approach | Pros | Cons |
|----------|------|------|
| Express + Core Package | Full control, flexible, lightweight | Manual lifecycle management |
| NestJS Adapter | Automatic lifecycle, DI | Framework dependency |
| Vanilla Node.js | Maximum flexibility | More boilerplate |

## Next Steps

- Add more SQS listeners for different queues
- Implement custom error handlers
- Add metrics and monitoring
- Integrate with your existing Express routes
- Deploy to production (AWS ECS, Kubernetes, etc.)

## Resources

- [Core Package Documentation](../../packages/core/README.md)
- [Express Documentation](https://expressjs.com/)
- [AWS SQS Best Practices](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-best-practices.html)
