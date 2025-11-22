# Fastify SQS Listener - Basic Example

This example demonstrates how to integrate SQS message consumption into a Fastify application using the
`@snow-tzu/fastify-sqs-listener` adapter package.

## 🎯 What You'll Learn

- **Fastify Plugin Integration**: How to register SQS listeners as Fastify plugins
- **TypeScript Support**: Full type safety with message validation using class-validator
- **Composable Decorators**: Using the decorator pattern for cross-cutting concerns (tracing, retry logic)
- **Multiple Message Types**: Handling different message types through separate plugin registrations
- **Service Layer Separation**: Keeping business logic separate from message handling
- **Lifecycle Management**: Automatic startup/shutdown with Fastify's lifecycle hooks
- **Error Handling**: Proper error handling and retry mechanisms

## 📦 Architecture

```
src/
├── index.ts                           # Main application entry point
├── events/                            # Message type definitions
│   ├── order-created.event.ts        # Order event with validation
│   └── notification.event.ts         # Notification event
├── listeners/                         # Message handlers
│   ├── order-created.listener.ts     # Order processing logic
│   └── notification.listener.ts      # Notification handling
├── services/                          # Business logic layer
│   ├── order.service.ts              # Order processing service
│   └── notification.service.ts       # Notification service
└── decorators/                        # Composable decorators
    ├── trace-listener.decorator.ts   # Tracing/timing decorator
    └── retry-listener.decorator.ts   # Retry logic decorator
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Environment

```bash
cp .env.example .env
```

The example is pre-configured to work with LocalStack for local testing.

### 3. Start LocalStack (from examples directory)

```bash
cd ../
docker-compose up -d
./scripts/setup-queues.sh
```

### 4. Start the Application

```bash
npm run start:dev
```

You should see output like:

```
[10:30:15 Z] INFO: 🚀 Fastify SQS Listener Example started successfully
[10:30:15 Z] INFO: 📋 Available endpoints:
[10:30:15 Z] INFO:    GET /health - Health check
[10:30:15 Z] INFO:    GET /status - SQS containers status
[10:30:15 Z] INFO: 🔄 Multiple SQS containers registered:
[10:30:15 Z] INFO:    - Order processor: handling OrderCreatedEvent messages
[10:30:15 Z] INFO:    - Notification processor: handling NotificationEvent messages
```

### 5. Send Test Messages

From the examples directory:

```bash
./scripts/send-test-messages.sh localstack
```

You should see messages being processed in the application logs.

## 🔧 Key Features Demonstrated

### Fastify Plugin Registration

```typescript
// Register SQS listener plugin with single listener approach
// Each plugin registration handles one message type with one listener
await fastify.register(sqsListenerPlugin, {
    queueNameOrUrl: process.env.ORDER_QUEUE_URL,
    listener: {
        messageType: OrderCreatedEvent,
        listener: resilientOrderListener
    },
    sqsClient,
    autoStartup: true,
    maxConcurrentMessages: 5,
    containerId: 'order-processor'
});

// Register separate plugin for different message type
await fastify.register(sqsListenerPlugin, {
    queueNameOrUrl: process.env.NOTIFICATION_QUEUE_URL,
    listener: {
        messageType: NotificationEvent,
        listener: notificationListener
    },
    sqsClient,
    autoStartup: true,
    maxConcurrentMessages: 3,
    containerId: 'notification-processor'
});
```

### TypeScript Message Validation

```typescript
export class OrderCreatedEvent {
    @IsString()
    orderId: string;

    @IsString()
    customerId: string;

    @IsNumber()
    @IsPositive()
    amount: number;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items: OrderItem[];
}
```

### Composable Decorator Pattern

```typescript
// Base listener
const orderListener = new OrderCreatedListener(orderService, fastify.log);

// Add tracing
const tracedOrderListener = new TraceListenerDecorator(orderListener, fastify.log);
```

### QueueListener Implementation

```typescript
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
    constructor(
        private readonly orderService: OrderService,
        private readonly logger: any
    ) {
    }

    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        this.logger.info('Processing order created event', {
            orderId: message.orderId,
            messageId: context.messageId
        });

        await this.orderService.processOrder(message);
    }
}
```

## 🔍 Testing the Example

### Health Check

```bash
curl http://localhost:3000/health
```

Response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:15.123Z",
  "uptime": 45.678,
  "environment": {
    "nodeVersion": "v18.17.0",
    "platform": "darwin",
    "arch": "x64"
  }
}
```

### SQS Containers Status

```bash
curl http://localhost:3000/status
```

Response:

```json
{
  "containers": {
    "orderProcessor": {
      "containerId": "order-processor",
      "queue": "http://localhost:4566/000000000000/order-events",
      "messageType": "OrderCreatedEvent"
    },
    "notificationProcessor": {
      "containerId": "notification-processor",
      "queue": "http://localhost:4566/000000000000/notification-events",
      "messageType": "NotificationEvent"
    }
  },
  "queues": {
    "orderQueue": "order-events",
    "notificationQueue": "notification-events"
  }
}
```

### Send Individual Messages

Order message:

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": 99.99,
    "items": [
      {
        "productId": "product-1",
        "quantity": 2,
        "price": 29.99
      },
      {
        "productId": "product-2",
        "quantity": 1,
        "price": 39.99
      }
    ]
  }' \
  --endpoint-url http://localhost:4566
```

Notification message:

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/notification-events \
  --message-body '{
    "userId": "user-123",
    "type": "email",
    "message": "Your order has been processed successfully!",
    "subject": "Order Confirmation"
  }' \
  --endpoint-url http://localhost:4566
```

## 🛠 Configuration Options

The example demonstrates various configuration options:

```typescript
await fastify.register(sqsListenerPlugin, {
    queueNameOrUrl: 'your-queue-name',
    listener: {
        messageType: YourMessageType,
        listener: yourListener
    },
    sqsClient: sqsClient,

    // Optional configuration
    autoStartup: true,              // Start automatically with Fastify
    maxConcurrentMessages: 5,       // Process up to 5 messages concurrently
    maxMessagesPerPoll: 10,         // Receive up to 10 messages per poll
    pollTimeout: 20,                // Long polling timeout (seconds)
    visibilityTimeout: 30,          // Message visibility timeout (seconds)
    acknowledgementMode: 'ON_SUCCESS', // When to acknowledge messages
    pollingErrorBackoff: 5,         // Backoff on polling errors (seconds)
    containerId: 'my-processor',     // Container ID for logging
    enableBatchAcknowledgement: true,  // Enable batch acknowledgements
    batchAcknowledgementOptions: {maxSize: 5, flushIntervalMs: 50},  // Smaller batches for notifications
});
```

## 🔄 Composable Patterns

### Available Decorators

1. **MetricsListenerDecorator**: Adds timing information

### Creating Custom Decorators

```typescript
export class MetricsListenerDecorator<T> implements QueueListener<T> {
    constructor(
        private readonly wrappedListener: QueueListener<T>,
        private readonly metricsService: MetricsService
    ) {
    }

    async onMessage(message: T, context: MessageContext): Promise<void> {
        const startTime = Date.now();

        try {
            await this.wrappedListener.onMessage(message, context);
            this.metricsService.recordSuccess(Date.now() - startTime);
        } catch (error) {
            this.metricsService.recordError(Date.now() - startTime);
            throw error;
        }
    }
}
```

## 🚨 Error Handling

The example demonstrates several error handling patterns:

1. **Service-level errors**: Caught and logged in listeners
2. **Validation errors**: Automatically handled by class-validator
3. **Graceful shutdown**: Proper cleanup on application termination

## 🔧 Troubleshooting

### Common Issues

1. **Plugin registration fails**
    - Check that all required options are provided
    - Verify SQS client configuration
    - Ensure message types have proper validation decorators

2. **Messages not being processed**
    - Verify LocalStack is running: `docker-compose ps`
    - Check queue URLs in environment variables
    - Confirm queues exist: `aws sqs list-queues --endpoint-url http://localhost:4566`

3. **TypeScript compilation errors**
    - Ensure `reflect-metadata` is imported
    - Check that decorators are enabled in tsconfig.json
    - Verify all dependencies are installed

### Debug Mode

Enable debug logging:

```bash
LOG_LEVEL=debug npm run start:dev
```

## 🔗 Related Examples

- [Express Basic Example](../express) - Same functionality with Express
- [Advanced Example](../advanced) - More complex patterns and features
- [Validation Examples](../VALIDATION_EXAMPLES.md) - Comprehensive validation guide

## 📚 Next Steps

1. **Explore Advanced Patterns**: Check out the advanced example for more complex scenarios
2. **Add Monitoring**: Integrate with your monitoring and metrics systems
3. **Custom Decorators**: Create your own decorators for specific cross-cutting concerns
4. **Production Configuration**: Configure for your production environment
5. **Testing**: Add unit and integration tests for your listeners

## 🤝 Support

If you encounter issues:

1. Check the troubleshooting section above
2. Review the main package documentation
3. Check existing GitHub issues
4. Open a new issue with detailed information

## 📄 License

This example is part of the @snow-tzu/sqs-listener project and is licensed under the MIT License.