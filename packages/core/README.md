# @snow-tzu/sqs-listener

Framework-agnostic SQS message listener with type safety and validation. This is the core package that can be used with any Node.js framework or vanilla Node.js applications.

## Features

- 🚀 Framework-agnostic - works with any Node.js framework or vanilla Node.js
- 🔒 Type-safe message handling with TypeScript
- ✅ Built-in validation support with class-validator
- 🔄 Automatic message acknowledgement with configurable modes
- 🎯 Concurrent message processing with configurable limits
- 🛡️ Comprehensive error handling
- 📝 Flexible logging abstraction
- 🔧 Manual lifecycle management for full control
- ⚡ **High performance**: ~500 msgs/sec throughput with optimized concurrency
- 💰 **Cost optimized**: 10x fewer API calls with batch acknowledgements (opt-in)

## Installation

```bash
npm install @snow-tzu/sqs-listener
# or
yarn add @snow-tzu/sqs-listener
```

For validation support, also install class-validator:

```bash
npm install class-validator
# or
yarn add class-validator
```

## Quick Start - Vanilla Node.js

Here's a complete example using vanilla Node.js:

```typescript
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  SqsMessageListenerContainer,
  QueueListener,
  MessageContext,
  ConsoleLogger,
  AcknowledgementMode
} from '@snow-tzu/sqs-listener';

// Define your message type
class OrderCreatedEvent {
  orderId: string;
  customerId: string;
  amount: number;
}

// Implement your message listener
class OrderListener implements QueueListener<OrderCreatedEvent> {
  async onMessage(
    payload: OrderCreatedEvent,
    context: MessageContext
  ): Promise<void> {
    console.log(`Processing order ${payload.orderId}`);
    console.log(`Customer: ${payload.customerId}, Amount: ${payload.amount}`);
    
    // Your business logic here
    await processOrder(payload);
    
    console.log(`Order ${payload.orderId} processed successfully`);
  }
}

// Create and configure the container
const sqsClient = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566' // LocalStack example
});

const logger = new ConsoleLogger('OrderListener');

const container = new SqsMessageListenerContainer<OrderCreatedEvent>(
  sqsClient,
  logger
);

// Configure the container
container.configure(options => {
  options
    .queueName('order-events-queue')
    .messageType(OrderCreatedEvent)
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
    .maxConcurrentMessages(5)
    .autoStartup(false); // Manual startup
});

// Set the message listener
container.setMessageListener(new OrderListener());

// Manual lifecycle management
async function start() {
  try {
    await container.start();
    console.log('Container started successfully');
  } catch (error) {
    console.error('Failed to start container:', error);
    process.exit(1);
  }
}

async function stop() {
  try {
    await container.stop();
    console.log('Container stopped successfully');
  } catch (error) {
    console.error('Failed to stop container:', error);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await stop();
  process.exit(0);
});

// Start the application
start();
```

## Logger Abstraction

The core package uses a logger abstraction to remain framework-agnostic. You can use the built-in `ConsoleLogger` or implement your own custom logger.

### Using the Default ConsoleLogger

```typescript
import { ConsoleLogger } from '@snow-tzu/sqs-listener';

const logger = new ConsoleLogger('MyContext');

logger.log('Information message');
logger.error('Error message', 'stack trace');
logger.warn('Warning message');
logger.debug('Debug message');
```

### Implementing a Custom Logger

Implement the `LoggerInterface` to integrate with your preferred logging library:

```typescript
import { LoggerInterface } from '@snow-tzu/sqs-listener';
import pino from 'pino';

class PinoLogger implements LoggerInterface {
  private logger: pino.Logger;

  constructor(context?: string) {
    this.logger = pino({
      name: context || 'SQS'
    });
  }

  log(message: string, context?: string): void {
    this.logger.info({ context }, message);
  }

  error(message: string, trace?: string, context?: string): void {
    this.logger.error({ context, trace }, message);
  }

  warn(message: string, context?: string): void {
    this.logger.warn({ context }, message);
  }

  debug(message: string, context?: string): void {
    this.logger.debug({ context }, message);
  }
}

// Use your custom logger
const container = new SqsMessageListenerContainer(
  sqsClient,
  new PinoLogger('OrderListener')
);
```

## Manual Lifecycle Management

The core package provides full control over the container lifecycle through `start()` and `stop()` methods.

### Starting the Container

```typescript
// Start listening for messages
await container.start();
```

### Stopping the Container

```typescript
// Stop listening and clean up resources
await container.stop();
```

### Integration with Express

```typescript
import express from 'express';
import { SqsMessageListenerContainer } from '@snow-tzu/sqs-listener';

const app = express();
const container = new SqsMessageListenerContainer(sqsClient);

// Configure container...
container.configure(options => {
  options.queueName('my-queue').autoStartup(false);
});

// Start container when server starts
const server = app.listen(3000, async () => {
  console.log('Server started on port 3000');
  await container.start();
  console.log('SQS listener started');
});

// Stop container when server stops
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down...');
  
  server.close(async () => {
    await container.stop();
    console.log('SQS listener stopped');
    process.exit(0);
  });
});
```

## Configuration Options

Configure the container using the fluent API:

```typescript
container.configure(options => {
  options
    .queueName('my-queue')                          // Required: SQS queue name
    .messageType(MyMessageClass)                    // Required: Message class type
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS) // Optional: When to acknowledge
    .maxConcurrentMessages(10)                      // Optional: Max parallel processing
    .autoStartup(false)                             // Optional: Manual vs auto start
    .waitTimeSeconds(20)                            // Optional: Long polling duration
    .visibilityTimeout(30)                          // Optional: Message visibility
    .converter(customConverter)                     // Optional: Custom message converter
    .errorHandler(customErrorHandler);              // Optional: Custom error handler
});
```

## Acknowledgement Modes

Control when messages are acknowledged and deleted from the queue:

- `AcknowledgementMode.ON_SUCCESS` - Acknowledge only after successful processing (default)
- `AcknowledgementMode.ALWAYS` - Acknowledge even if processing fails
- `AcknowledgementMode.MANUAL` - Manual acknowledgement via `context.acknowledge()`

```typescript
// Manual acknowledgement example
class MyListener implements QueueListener<MyMessage> {
  async onMessage(payload: MyMessage, context: MessageContext): Promise<void> {
    try {
      await processMessage(payload);
      await context.acknowledge(); // Manually acknowledge
    } catch (error) {
      // Don't acknowledge - message will be retried
      console.error('Processing failed:', error);
    }
  }
}
```

## Message Validation

Enable automatic validation using class-validator decorators:

```typescript
import { IsString, IsNumber, Min } from 'class-validator';

class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

// Configure validation
container.configure(options => {
  options
    .queueName('orders')
    .messageType(OrderCreatedEvent)
    .enableValidation(true)                    // Enable validation
    .validationFailureMode(ValidationFailureMode.REJECT); // Reject invalid messages
});
```

## Error Handling

Implement custom error handling:

```typescript
import { QueueListenerErrorHandler, MessageContext } from '@snow-tzu/sqs-listener';

class CustomErrorHandler implements QueueListenerErrorHandler {
  async handleError(
    error: Error,
    message: any,
    context: MessageContext
  ): Promise<void> {
    console.error(`Error processing message ${context.getMessageId()}:`, error);
    
    // Send to dead letter queue, log to monitoring service, etc.
    await sendToDeadLetterQueue(message);
  }
}

// Use custom error handler
container.configure(options => {
  options.errorHandler(new CustomErrorHandler());
});
```

## Batch Acknowledgements

Batch acknowledgements are a powerful cost and performance optimization that can reduce your AWS SQS API calls by up to 10x. This feature leverages AWS SQS's maximum 10 messages per batch limit and is particularly valuable for high-volume applications processing hundreds or thousands of messages.

### Quick Start

Enable batch acknowledgements with a single configuration option:

```typescript
import { SqsMessageListenerContainer, AcknowledgementMode } from '@snow-tzu/sqs-listener';

const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
  options
    .queueName('my-queue')
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
    .enableBatchAcknowledgement(true);  // Enable batch acknowledgements
});
```

### Configuration Options

#### Basic Configuration (Recommended)

```typescript
// Enable with optimal defaults
container.configure(options => {
  options
    .queueName('my-queue')
    .enableBatchAcknowledgement(true);
  // Defaults: batch size 10, flush interval 100ms
});
```

#### Advanced Configuration

```typescript
// Customize batch behavior
container.configure(options => {
  options
    .queueName('my-queue')
    .enableBatchAcknowledgement(true)
    .batchAcknowledgementOptions(10, 100);  // maxSize: 10, flushInterval: 100ms
});
```

#### Configuration for Different Use Cases

**High-Volume Applications** (maximize cost savings):
```typescript
container.configure(options => {
  options
    .queueName('high-volume-queue')
    .enableBatchAcknowledgement(true)
    .batchAcknowledgementOptions(10, 200);  // Larger batches, longer wait
});
```

**Low-Latency Applications** (minimize acknowledgement delay):
```typescript
container.configure(options => {
  options
    .queueName('low-latency-queue')
    .enableBatchAcknowledgement(true)
    .batchAcknowledgementOptions(5, 50);   // Smaller batches, faster flush
});
```

### How It Works

1. **Message Processing**: When messages are successfully processed, they're queued for batch acknowledgement
2. **Automatic Batching**: Messages are automatically grouped into batches up to the configured size (default: 10)
3. **Smart Flushing**: Batches are flushed when full or after the configured interval (default: 100ms)
4. **Graceful Shutdown**: All pending batches are flushed when the container stops

### Performance Benefits

#### API Call Reduction

| Messages | Without Batching | With Batching | Reduction |
|----------|------------------|---------------|-----------|
| 100      | 100 calls        | 10 calls      | 90%       |
| 1,000    | 1,000 calls      | 100 calls     | 90%       |
| 10,000   | 10,000 calls     | 1,000 calls   | 90%       |

#### Cost Savings

For an application processing 1 million messages per day:

| Scenario | API Calls/Day | Cost/Day* | Annual Savings |
|----------|---------------|-----------|----------------|
| Without Batching | 1,000,000 | $0.40 | - |
| With Batching | ~100,000 | $0.04 | ~$131 |

*Based on $0.0000004 per SQS request

### Compatibility

Batch acknowledgements work with all acknowledgement modes:

#### ON_SUCCESS Mode (Default)
```typescript
container.configure(options => {
  options
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
    .enableBatchAcknowledgement(true);
});
```

#### MANUAL Mode
```typescript
container.configure(options => {
  options
    .acknowledgementMode(AcknowledgementMode.MANUAL)
    .enableBatchAcknowledgement(true);
});

// In your listener
class MyListener implements QueueListener<MyMessage> {
  async onMessage(payload: MyMessage, context: MessageContext): Promise<void> {
    await processMessage(payload);
    await context.acknowledge();  // Batched automatically
  }
}
```

#### ALWAYS Mode
```typescript
container.configure(options => {
  options
    .acknowledgementMode(AcknowledgementMode.ALWAYS)
    .enableBatchAcknowledgement(true);
});
```

### Monitoring and Debugging

Enable debug logging to see batch behavior:

```typescript
import { ConsoleLogger } from '@snow-tzu/sqs-listener';

const logger = new ConsoleLogger('MyApp');
const container = new SqsMessageListenerContainer(sqsClient, logger);

// You'll see logs like:
// "Queued message xxx for batch acknowledgement (5/10)"
// "Batch acknowledging 10 messages from queue ..."
// "Flushing pending batch acknowledgements..."
```

### Best Practices

#### ✅ DO
- Enable batch acknowledgements for high-volume queues (>100 messages/day)
- Use default configuration as starting point
- Monitor batch efficiency in production
- Combine with appropriate `maxConcurrentMessages` for optimal throughput

#### ❌ DON'T
- Don't use for very low-volume queues (<10 messages/day)
- Don't set flush interval too high (>1000ms) as it delays acknowledgements
- Don't set batch size to 1 (defeats the purpose)
- Don't forget to test graceful shutdown behavior

### Troubleshooting

**Messages not being deleted:**
- Ensure `enableBatchAcknowledgement(true)` is set
- Check acknowledgement mode is not MANUAL without calling `acknowledge()`
- Verify container shutdown calls `await container.stop()`

**High acknowledgement latency:**
- Reduce flush interval: `.batchAcknowledgementOptions(10, 50)`
- Reduce batch size: `.batchAcknowledgementOptions(5, 100)`

For comprehensive troubleshooting, see the [Batch Acknowledgement Guide](./docs/BATCH_ACKNOWLEDGEMENT.md).

## Performance & Benchmarks

### Overview

`@snow-tzu/sqs-listener` is built for high performance with intelligent optimizations:

| Metric | Performance |
|--------|-------------|
| **Throughput** | ~500 msgs/sec @ concurrency 20 |
| **Latency (p50)** | 270ms |
| **Latency (p95)** | 305ms |
| **Latency (p99)** | 309ms |
| **API Efficiency** | 10x fewer API calls with batch acknowledgements |

### Key Optimizations

#### 1. Batch Acknowledgements 📦

Messages can be acknowledged in batches of up to 10 (AWS SQS limit), reducing API calls by up to 10x. See the [Batch Acknowledgements](#batch-acknowledgements) section above for detailed configuration.

**Benefits:**
- 10x reduction in API calls
- Lower AWS SQS costs
- Reduced latency
- Better throughput

#### 2. Optimized Concurrency Control

Fast-path semaphore implementation for minimal overhead:

```typescript
container.configure(options => {
  options
    .maxConcurrentMessages(20)  // Process 20 messages in parallel
    .maxMessagesPerPoll(10);    // Fetch 10 messages per poll
});
```

### Benchmark Results

Run benchmarks yourself:

```bash
# Start LocalStack
docker run --rm -d -p 4566:4566 localstack/localstack:2.3

# Run all benchmarks
yarn benchmark

# Or run individually
yarn benchmark:throughput  # Messages per second
yarn benchmark:latency     # End-to-end latency
yarn benchmark:memory      # Memory usage
```

#### Throughput Benchmark

Messages processed per second at various concurrency levels:

```
Concurrency 1:   990 msgs/sec
Concurrency 5:   990 msgs/sec
Concurrency 10:  1000 msgs/sec ⚡
Concurrency 20:  990 msgs/sec
```

#### Latency Benchmark

End-to-end processing time (200 messages, concurrency 10):

```
p50 (median): 177.50ms
p95:          241.00ms
p99:          268.00ms
Mean:         180.22ms
```

### Performance Tuning

#### For High Throughput

```typescript
container.configure(options => {
  options
    .maxConcurrentMessages(20)   // High parallelism
    .maxMessagesPerPoll(10)      // Max batch size
    .pollTimeout(1);             // Fast polling
});
```

#### For Low Latency

```typescript
container.configure(options => {
  options
    .maxConcurrentMessages(5)    // Lower concurrency
    .pollTimeout(1)              // Quick response
    .acknowledgementMode(AcknowledgementMode.ALWAYS);
});
```

#### For Cost Optimization

```typescript
container.configure(options => {
  options
    .maxConcurrentMessages(5)
    .pollTimeout(20)             // Max long polling (free)
    .maxMessagesPerPoll(10);     // Batch fetching
});
```

### Monitoring

Track these metrics in production:

1. **Throughput**: Messages processed per second
2. **Latency**: End-to-end processing time (p50, p95, p99)
3. **Error Rate**: Failed message percentage
4. **Queue Depth**: Messages waiting in queue
5. **API Calls**: SQS API call count (cost tracking)

See [PERFORMANCE.md](https://github.com/ganesanarun/sqs-listener/blob/main/README.md#performance) for detailed analysis and [GitHub Performance Reports](https://github.com/ganesanarun/sqs-listener/tree/main/packages/core/benchmark) for live benchmark results.

## Framework Adapters

If you're using a specific framework, consider using the framework-specific adapter for better integration:

- **NestJS**: Use `@snow-tzu/nest-sqs-listener` for automatic lifecycle management and dependency injection
- **Fastify**: Use `@snow-tzu/fastify-sqs-listener` for automatic Fastify's lifecycle hooks.
- **Express**: Use the core package with manual lifecycle management (as shown above)
- **Other frameworks**: Use the core package with your framework's lifecycle management

## API Reference

### SqsMessageListenerContainer

Main class for managing SQS message consumption.

**Constructor:**
```typescript
constructor(sqsClient: SQSClient, logger?: LoggerInterface)
```

**Methods:**
- `configure(callback: (options: ContainerOptions) => void): void` - Configure the container
- `setMessageListener(listener: QueueListener<T>): void` - Set the message listener
- `start(): Promise<void>` - Start listening for messages
- `stop(): Promise<void>` - Stop listening and clean up resources

### QueueListener<T>

Interface for implementing message listeners.

```typescript
interface QueueListener<T> {
  onMessage(payload: T, context: MessageContext): Promise<void>;
}
```

### MessageContext

Provides context and control for message processing.

**Methods:**
- `getMessageId(): string` - Get the SQS message ID
- `getReceiptHandle(): string` - Get the receipt handle
- `getAttributes(): MessageAttributes` - Get message attributes
- `acknowledge(): Promise<void>` - Manually acknowledge the message

### LoggerInterface

Interface for implementing custom loggers.

```typescript
interface LoggerInterface {
  log(message: string, context?: string): void;
  error(message: string, trace?: string, context?: string): void;
  warn(message: string, context?: string): void;
  debug(message: string, context?: string): void;
}
```

## Examples

Check out the examples directory for more complete examples:

- `examples/vanilla-nodejs/` - Basic vanilla Node.js usage
- `examples/express/` - Integration with Express

## License

MIT
