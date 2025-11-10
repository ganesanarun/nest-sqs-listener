# Advanced Example - NestJS SQS Listener

This advanced example demonstrates sophisticated patterns and features for production-ready SQS message processing with NestJS.

## Overview

This example showcases advanced usage patterns including:
- Multiple queue listeners with different configurations
- **Advanced message validation with different failure modes**
- **Custom error handling for validation errors**
- Listener decorator pattern for adding cross-cutting concerns (tracing)
- OpenTelemetry distributed tracing implementation
- Custom error handling with retry logic
- Manual message acknowledgement
- Multiple AWS account connections
- Symbol-based dependency injection for type safety
- Concurrency control and performance tuning

## Features

### 1. Multiple Queue Listeners
- **Order Queue**: Processes order creation events with automatic acknowledgement and THROW validation mode
- **Notification Queue**: Handles notification events with manual acknowledgement and ACKNOWLEDGE validation mode

### 2. Listener Decorator Pattern
The `TracingListener` decorator wraps business logic listeners to add OpenTelemetry tracing without modifying the core business logic. This pattern allows you to:
- Keep business logic clean and focused
- Add cross-cutting concerns like tracing, logging, or metrics
- Compose multiple decorators together
- Test business logic independently

### 3. OpenTelemetry Tracing
Full distributed tracing implementation that:
- Extracts trace context from SQS message attributes
- Creates spans for message processing
- Records exceptions and errors
- Propagates trace context across services
- Automatically injects trace IDs into all logs via Pino logger

### 4. Custom Error Handling
Implements intelligent error handling that:
- Logs detailed error information
- **Handles validation errors specifically with formatted error output**
- **Acknowledges invalid messages immediately to prevent infinite retries**
- Acknowledges messages after max retries to prevent infinite loops
- Allows natural retry behavior for transient errors

### 5. Multiple AWS Accounts
Demonstrates connecting to different AWS accounts for different queues:
- Order queue connects to primary AWS account
- Notification queue connects to secondary AWS account
- Each connection uses separate SQS clients with different credentials

### 6. Symbol-Based Dependency Injection
Uses TypeScript Symbols instead of string literals for provider tokens:
- Prevents naming collisions
- Provides compile-time type safety
- Better IDE support and refactoring
- Clear intent and documentation

## Setup

### Prerequisites
- Node.js 18+ and npm
- Docker and Docker Compose (for LocalStack)
- AWS account(s) or LocalStack for local testing

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

3. Edit `.env` with your configuration:

**For LocalStack (local testing):**
```env
ORDER_AWS_ENDPOINT=http://localhost:4566
ORDER_AWS_REGION=us-east-1
ORDER_AWS_ACCESS_KEY_ID=test
ORDER_AWS_SECRET_ACCESS_KEY=test
ORDER_QUEUE_NAME=order-events

NOTIFICATION_AWS_ENDPOINT=http://localhost:4566
NOTIFICATION_AWS_REGION=us-east-1
NOTIFICATION_AWS_ACCESS_KEY_ID=test
NOTIFICATION_AWS_SECRET_ACCESS_KEY=test
NOTIFICATION_QUEUE_NAME=notification-events
```

**For AWS (production):**
```env
ORDER_AWS_REGION=us-east-1
ORDER_AWS_ACCESS_KEY_ID=your-primary-access-key
ORDER_AWS_SECRET_ACCESS_KEY=your-primary-secret-key
ORDER_QUEUE_NAME=order-events

NOTIFICATION_AWS_REGION=us-west-2
NOTIFICATION_AWS_ACCESS_KEY_ID=your-secondary-access-key
NOTIFICATION_AWS_SECRET_ACCESS_KEY=your-secondary-secret-key
NOTIFICATION_QUEUE_NAME=notification-events
```

### LocalStack Setup

1. Start LocalStack from the examples directory:
```bash
cd ..
docker-compose up -d
```

2. Create queues:
```bash
./scripts/setup-queues.sh
```

## Running

### Development Mode
```bash
npm run start:dev
```

### Production Mode
```bash
npm run build
npm run start:prod
```

## Testing

### Send Test Messages

From the examples directory:

```bash
# Send to LocalStack
./scripts/send-test-messages.sh localstack

# Send to AWS
./scripts/send-test-messages.sh aws
```

### Expected Output

You should see logs showing:
- Message reception with trace IDs automatically included in every log entry
- OpenTelemetry span creation
- Business logic execution
- Message acknowledgement (manual for notifications)
- Trace context propagation

**Note:** The Pino logger automatically injects `traceId` and `spanId` into every log entry, so you'll see them in all logs without explicitly logging them in your code.

## Code Structure

```
src/
├── main.ts                          # Application entry point with OpenTelemetry setup
├── app.module.ts                    # Root module
├── tokens.ts                        # Symbol definitions for DI tokens
├── config/
│   └── aws.config.ts               # SQS client factory functions
├── events/
│   ├── order-created.event.ts      # Order event model
│   └── notification.event.ts       # Notification event model
├── listeners/
│   ├── order-created.listener.ts   # Order business logic listener
│   ├── notification.listener.ts    # Notification business logic listener
│   └── tracing.listener.ts         # Tracing decorator
├── services/
│   ├── order.service.ts            # Order processing service
│   └── notification.service.ts     # Notification service
├── error-handlers/
│   └── custom-error.handler.ts     # Custom error handling logic
└── modules/
    ├── aws.module.ts               # AWS client providers
    ├── order.module.ts             # Order queue container
    └── notification.module.ts      # Notification queue container
```

## Key Concepts

### Listener Decorator Pattern

The decorator pattern allows you to wrap listeners with additional functionality without modifying the core business logic.

**Business Logic Listener:**
```typescript
@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
  constructor(private readonly orderService: OrderService) {}

  async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
    await this.orderService.processNewOrder(message);
  }
}
```

**Tracing Decorator:**
```typescript
export class TracingListener<T> implements QueueListener<T> {
  constructor(private readonly listener: QueueListener<T>) {}

  async onMessage(payload: T, context: MessageContext): Promise<void> {
    const tracer = trace.getTracer('sqs-listener');
    const span = tracer.startSpan('sqs.consume');
    
    try {
      await this.listener.onMessage(payload, context);
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  }
}
```

**Usage in Module:**
```typescript
{
  provide: ORDER_CONTAINER,
  useFactory: (listener: OrderCreatedListener, sqsClient: SQSClient) => {
    const container = new SqsMessageListenerContainer(sqsClient);
    // ... configuration
    container.setMessageListener(new TracingListener(listener));
    return container;
  },
  inject: [OrderCreatedListener, ORDER_SQS_CLIENT],
}
```

**Benefits:**
- Business logic remains clean and testable
- Tracing can be added/removed without code changes
- Multiple decorators can be composed
- Each decorator has a single responsibility

**How to Implement Your Own Decorators:**

You can create decorators for any cross-cutting concern:

```typescript
// Logging decorator
export class LoggingListener<T> implements QueueListener<T> {
  constructor(private readonly listener: QueueListener<T>) {}

  async onMessage(payload: T, context: MessageContext): Promise<void> {
    console.log(`Processing message: ${context.getMessageId()}`);
    const start = Date.now();
    
    try {
      await this.listener.onMessage(payload, context);
      console.log(`Completed in ${Date.now() - start}ms`);
    } catch (error) {
      console.error(`Failed after ${Date.now() - start}ms:`, error);
      throw error;
    }
  }
}

// Metrics decorator
export class MetricsListener<T> implements QueueListener<T> {
  constructor(
    private readonly listener: QueueListener<T>,
    private readonly metricsService: MetricsService
  ) {}

  async onMessage(payload: T, context: MessageContext): Promise<void> {
    this.metricsService.increment('messages.received');
    const start = Date.now();
    
    try {
      await this.listener.onMessage(payload, context);
      this.metricsService.timing('messages.duration', Date.now() - start);
      this.metricsService.increment('messages.success');
    } catch (error) {
      this.metricsService.increment('messages.error');
      throw error;
    }
  }
}

// Compose multiple decorators
const listener = new OrderCreatedListener(orderService);
const withLogging = new LoggingListener(listener);
const withMetrics = new MetricsListener(withLogging, metricsService);
const withTracing = new TracingListener(withMetrics);

container.setMessageListener(withTracing);
```

### OpenTelemetry Tracing

This example demonstrates how to implement distributed tracing:

**1. Initialize Tracer Provider (main.ts):**
```typescript
const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'nest-sqs-listener-app',
  }),
});
provider.register();
propagation.setGlobalPropagator(new W3CTraceContextPropagator());
```

**2. Extract Trace Context from Message:**
```typescript
const attributes = toAttrRecord(context.getMessageAttributes());
let ctx = otContext.active();
const traceParent = attributes.traceparent;
if (traceParent) {
  ctx = propagation.extract(ctx, attributes, getter);
}
```

**3. Create Span and Execute:**
```typescript
const span = tracer.startSpan('sqs.consume', undefined, ctx);
try {
  await otContext.with(trace.setSpan(ctx, span), async () => {
    await this.listener.onMessage(payload, context);
  });
} finally {
  span.end();
}
```

**Trace Context Propagation:**
When sending messages to SQS, include trace context in message attributes:
```typescript
const span = trace.getActiveSpan();
const carrier = {};
propagation.inject(otContext.active(), carrier);

await sqsClient.send(new SendMessageCommand({
  QueueUrl: queueUrl,
  MessageBody: JSON.stringify(payload),
  MessageAttributes: {
    traceparent: {
      DataType: 'String',
      StringValue: carrier['traceparent'],
    },
  },
}));
```

### Pino Logger with Automatic Trace Context

This example uses a custom Pino logger that automatically injects OpenTelemetry trace context into every log entry:

```typescript
export class PinoOtelLoggerService implements LoggerService {
  private withTrace(meta: Record<string, any> = {}) {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      meta = {
        ...meta,
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
      };
    }
    return meta;
  }
  
  log(message: any, ...optionalParams: any[]) {
    this.logger.info(this.withTrace(), message, ...optionalParams);
  }
}
```

**Benefits:**
- No need to manually log trace IDs in your listeners
- All logs automatically include trace context
- Cleaner business logic code
- Consistent observability across the application

### Symbol-Based Dependency Injection

Using Symbols instead of strings for provider tokens provides type safety and prevents naming collisions.

**Define Symbols (tokens.ts):**
```typescript
export const ORDER_SQS_CLIENT = Symbol('ORDER_SQS_CLIENT');
export const ORDER_CONTAINER = Symbol('ORDER_CONTAINER');
export const NOTIFICATION_SQS_CLIENT = Symbol('NOTIFICATION_SQS_CLIENT');
export const NOTIFICATION_CONTAINER = Symbol('NOTIFICATION_CONTAINER');
```

**Use in Providers:**
```typescript
{
  provide: ORDER_SQS_CLIENT,
  useFactory: () => createOrderSQSClient(),
}
```

**Inject in Factories:**
```typescript
{
  provide: ORDER_CONTAINER,
  useFactory: (listener, sqsClient) => {
    // ... create container
  },
  inject: [OrderCreatedListener, ORDER_SQS_CLIENT],
}
```

**Benefits:**
- Compile-time type safety
- No string typos
- Better refactoring support
- Clear intent
- Prevents accidental naming collisions

### Multiple AWS Account Connections

This example shows how to connect to different AWS accounts for different queues.

**Separate Client Factories (aws.config.ts):**
```typescript
export function createOrderSQSClient(): SQSClient {
  return new SQSClient({
    region: process.env.ORDER_AWS_REGION,
    credentials: {
      accessKeyId: process.env.ORDER_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.ORDER_AWS_SECRET_ACCESS_KEY,
    },
  });
}

export function createNotificationSQSClient(): SQSClient {
  return new SQSClient({
    region: process.env.NOTIFICATION_AWS_REGION,
    credentials: {
      accessKeyId: process.env.NOTIFICATION_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.NOTIFICATION_AWS_SECRET_ACCESS_KEY,
    },
  });
}
```

**Separate Providers (aws.module.ts):**
```typescript
{
  provide: ORDER_SQS_CLIENT,
  useFactory: () => createOrderSQSClient(),
},
{
  provide: NOTIFICATION_SQS_CLIENT,
  useFactory: () => createNotificationSQSClient(),
}
```

**Use in Modules:**
```typescript
// order.module.ts
inject: [OrderCreatedListener, ORDER_SQS_CLIENT, CustomErrorHandler]

// notification.module.ts
inject: [NotificationListener, NOTIFICATION_SQS_CLIENT]
```

### Manual Acknowledgement

The notification listener demonstrates manual acknowledgement for fine-grained control:

```typescript
async onMessage(message: NotificationEvent, context: MessageContext): Promise<void> {
  await this.notificationService.sendNotification(message);
  
  // Explicitly acknowledge after successful processing
  await context.acknowledge();
}
```

**When to use manual acknowledgement:**
- You need to acknowledge messages conditionally
- You want to control exactly when messages are removed from the queue
- You're implementing custom retry logic
- You need to acknowledge messages even after errors (in error handler)

**When to use automatic acknowledgement (ON_SUCCESS):**
- Simple success/failure scenarios
- You want messages to retry automatically on errors
- You don't need fine-grained control over acknowledgement

### Message Validation with Different Failure Modes

This example demonstrates advanced validation patterns with different failure modes for different queues.

#### Order Queue - THROW Mode (with Custom Error Handler)

The order queue uses `ValidationFailureMode.THROW` which throws validation errors and invokes the custom error handler:

```typescript
container.configure(options => {
  options
    .queueNames('order-events')
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.THROW)
    .validatorOptions({
      whitelist: true,
      forbidNonWhitelisted: true, // Reject messages with unexpected properties
    });
});

container.setErrorHandler(errorHandler);
```

**Event class with strict validation:**
```typescript
export class OrderCreatedEvent {
  @IsUUID()
  orderId: string;

  @IsUUID()
  customerId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  items: OrderItem[];
}
```

**Custom error handler detects validation errors:**
```typescript
async handleError(error: Error, message: any, context: MessageContext): Promise<void> {
  if (error instanceof MessageValidationError) {
    this.logger.error('Validation failed with the following errors:');
    this.logger.error(error.getFormattedErrors());
    
    // Acknowledge invalid messages immediately - they won't become valid on retry
    this.logger.warn('Acknowledging invalid message to prevent infinite retries');
    await context.acknowledge();
    return;
  }
  
  // Handle other errors with retry logic...
}
```

**Benefits of THROW mode:**
- Full control over error handling
- Can implement custom logic based on error type
- Can send validation errors to monitoring systems
- Can route invalid messages to DLQ or special handling queue

#### Notification Queue - ACKNOWLEDGE Mode

The notification queue uses `ValidationFailureMode.ACKNOWLEDGE` which automatically acknowledges invalid messages without invoking the error handler:

```typescript
container.configure(options => {
  options
    .queueNames('notification-events')
    .targetClass(NotificationEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
    .validatorOptions({
      whitelist: true,
    });
});
```

**Event class with validation:**
```typescript
export class NotificationEvent {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsIn(['email', 'sms', 'push'])
  type: 'email' | 'sms' | 'push';

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @IsString()
  @IsNotEmpty()
  message: string;
}
```

**Benefits of ACKNOWLEDGE mode:**
- Invalid messages are automatically removed from queue
- No error handler overhead
- Validation errors are logged but don't trigger alerts
- Useful for non-critical queues where invalid messages can be discarded

#### Validation Failure Mode Comparison

| Mode | Behavior | Error Handler | Use Case |
|------|----------|---------------|----------|
| **THROW** | Throws error, invokes error handler | ✅ Invoked | Critical queues, custom error handling, monitoring |
| **ACKNOWLEDGE** | Logs error, acknowledges message | ❌ Not invoked | Non-critical queues, discard invalid messages |
| **REJECT** | Logs error, doesn't acknowledge | ❌ Not invoked | Let SQS retry, eventually move to DLQ |

#### Testing Validation

**Send valid order message:**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "550e8400-e29b-41d4-a716-446655440000",
    "customerId": "650e8400-e29b-41d4-a716-446655440000",
    "amount": 99.99,
    "items": [{"productId": "prod-1", "quantity": 2}]
  }' \
  --endpoint-url http://localhost:4566
```

**Send invalid order message (non-UUID orderId):**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "invalid-id",
    "customerId": "650e8400-e29b-41d4-a716-446655440000",
    "amount": 99.99,
    "items": [{"productId": "prod-1", "quantity": 2}]
  }' \
  --endpoint-url http://localhost:4566
```

You'll see the custom error handler log validation errors and acknowledge the message.

**Send invalid notification message (invalid type):**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/notification-events \
  --message-body '{
    "userId": "user-123",
    "type": "invalid-type",
    "subject": "Test",
    "message": "Hello"
  }' \
  --endpoint-url http://localhost:4566
```

The message will be automatically acknowledged without invoking the error handler.

### Custom Error Handling

The custom error handler implements intelligent retry logic:

```typescript
async handleError(error: Error, message: any, context: MessageContext): Promise<void> {
  this.logger.error(`Error: ${error.message}`);
  this.logger.error(`Receive count: ${context.getApproximateReceiveCount()}`);
  
  // Handle validation errors specifically
  if (error instanceof MessageValidationError) {
    this.logger.error('Validation failed with the following errors:');
    this.logger.error(error.getFormattedErrors());
    
    // Acknowledge invalid messages immediately - they won't become valid on retry
    this.logger.warn('Acknowledging invalid message to prevent infinite retries');
    await context.acknowledge();
    return;
  }
  
  // Acknowledge after max retries to prevent infinite loop
  if (context.getApproximateReceiveCount() > 3) {
    this.logger.warn('Max retries exceeded, acknowledging message');
    await context.acknowledge();
  }
  // Otherwise, don't acknowledge to allow retry
}
```

**Error Handling Strategies:**
- **Validation errors**: Acknowledge immediately (no point retrying - demonstrated in this example)
- **Transient errors**: Don't acknowledge, let SQS retry
- **Permanent errors**: Acknowledge to remove from queue
- **Max retries exceeded**: Acknowledge and optionally send to DLQ

## Next Steps

- Review the [main package documentation](../../README.md) for detailed API reference
- Explore the [basic example](../basic) for simpler use cases
- Check out the [scripts](../scripts) for queue management utilities
- Learn about [LocalStack setup](../README.md#localstack-setup) for local testing

## Notes

- This example uses the published `@snow-tzu/nest-sqs-listener` package
- For local development of the package, change the dependency to `"file:../.."`
- OpenTelemetry tracing is optional - remove it if you don't need distributed tracing
- The decorator pattern works with any observability tool, not just OpenTelemetry
- Symbol tokens are recommended but optional - you can use strings if preferred
