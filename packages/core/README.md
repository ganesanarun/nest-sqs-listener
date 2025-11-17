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

## Framework Adapters

If you're using a specific framework, consider using the framework-specific adapter for better integration:

- **NestJS**: Use `@snow-tzu/nest-sqs-listener` for automatic lifecycle management and dependency injection
- **Express**: Use the core package with manual lifecycle management (as shown above)
- **Fastify**: Use the core package with Fastify's lifecycle hooks
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
