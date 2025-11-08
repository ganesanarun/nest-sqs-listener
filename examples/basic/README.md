# Basic Example

This example demonstrates the minimal setup required to get started with `@snow-tzu/nestjs-sqs-listener`. It shows a simple order processing system with a single SQS queue listener using automatic acknowledgement.

## What This Example Demonstrates

- Single queue listener configuration
- ON_SUCCESS acknowledgement mode (automatic)
- Basic business logic separation (listener → service)
- Simple error handling (default)
- LocalStack setup for local testing
- AWS SQS integration for production
- Symbol-based dependency injection for type safety
- Pino logger with automatic trace context injection

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for LocalStack)
- AWS account and credentials (for AWS testing)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

**For LocalStack (local testing):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
ORDER_QUEUE_NAME=order-events
```

**For AWS (production):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
ORDER_QUEUE_NAME=order-events
```

### 3. Start LocalStack (for local testing)

From the examples directory:

```bash
cd ..
docker-compose up -d
```

### 4. Create Queue

For LocalStack:
```bash
cd ../scripts
./setup-queues.sh
```

For AWS, create the queue using AWS CLI or Console:
```bash
aws sqs create-queue --queue-name order-events --region us-east-1
```

## Running

Start the application:

```bash
npm run start:dev
```

You should see output indicating the listener is active:
```
[Bootstrap] Starting SQS Listener Application...
[Bootstrap] AWS Endpoint: http://localhost:4566
[Bootstrap] AWS Region: us-east-1
[OrderCreatedContainer] Creating Order Created Container
[OrderCreatedContainer] Order Created Container configured successfully
[Bootstrap] Application initialized successfully
[Bootstrap] SQS listeners are now active and polling for messages
```

## Testing

### Send Test Messages

For LocalStack:
```bash
cd ../scripts
./send-test-messages.sh localstack
```

For AWS:
```bash
cd ../scripts
./send-test-messages.sh aws
```

Or manually send a message using AWS CLI:

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": 99.99,
    "items": [
      {"productId": "prod-1", "quantity": 2}
    ]
  }' \
  --endpoint-url http://localhost:4566
```

### Expected Output

When a message is received, you should see:

```
[OrderCreatedListener] Received order message: <message-id>
[OrderCreatedListener] Receive count: 1
[OrderService] Processing order order-123 for customer customer-456
[OrderService] Order amount: 99.99
[OrderService] Items: 1
[OrderService] Order order-123 processed successfully
[OrderCreatedListener] Order message processed successfully
```

## Code Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── config/
│   └── aws.config.ts               # SQS client configuration
├── events/
│   └── order-created.event.ts      # Event data model
├── listeners/
│   └── order-created.listener.ts   # Message listener (implements QueueListener)
├── services/
│   └── order.service.ts            # Business logic
└── modules/
    ├── aws.module.ts               # AWS client provider
    └── order.module.ts             # Container configuration
```

### Key Files

**order-created.listener.ts**: Implements the `QueueListener<T>` interface. This is where you receive messages and delegate to business logic.

**order.module.ts**: Configures the `SqsMessageListenerContainer` with queue name, acknowledgement mode, concurrency, and other options.

**order.service.ts**: Contains the business logic for processing orders. Keeps the listener clean and focused.

## Configuration Options

The container is configured in `order.module.ts`:

```typescript
container.configure(options => {
  options
    .queueNames('order-events')              // Queue to listen to
    .pollTimeout(20)                         // Long polling timeout (seconds)
    .autoStartup(true)                       // Start listening on app init
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)  // Auto-ack on success
    .maxConcurrentMessages(5)                // Process up to 5 messages concurrently
    .visibilityTimeout(30)                   // Message visibility timeout (seconds)
    .maxMessagesPerPoll(10);                 // Max messages per poll request
});
```

## Next Steps

- Check out the [Advanced Example](../advanced) to learn about:
  - Multiple queue listeners
  - Manual acknowledgement mode
  - Custom error handling
  - Listener decorator pattern for tracing
  - Multiple AWS account connections
  - Symbol-based dependency injection
- Read the [main package documentation](../../README.md) for detailed API reference
