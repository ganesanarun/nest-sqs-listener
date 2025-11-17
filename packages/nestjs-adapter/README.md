# @snow-tzu/nest-sqs-listener

NestJS adapter for the framework-agnostic `@snow-tzu/sqs-listener` package. This adapter provides seamless integration with NestJS's dependency injection system and lifecycle hooks.

## Features

- 🔄 **Automatic Lifecycle Management** - Integrates with NestJS module initialization and destruction
- 💉 **Dependency Injection** - Full support for NestJS DI with `@Injectable` decorator
- 📝 **NestJS Logger Integration** - Uses NestJS Logger for consistent logging
- 🔙 **100% Backward Compatible** - Drop-in replacement for version 0.0.4
- 🎯 **Type Safe** - Full TypeScript support with generics
- ✅ **Message Validation** - Built-in support for class-validator
- 🚀 **High Performance** - Efficient message processing with concurrency control

## Installation

```bash
npm install @snow-tzu/nest-sqs-listener
# or
yarn add @snow-tzu/nest-sqs-listener
```

### Peer Dependencies

This package requires the following peer dependencies:

```bash
npm install @nestjs/common @nestjs/core rxjs
# or
yarn add @nestjs/common @nestjs/core rxjs
```

## Quick Start

### 1. Define Your Event Class

```typescript
// order-created.event.ts
import { IsString, IsNumber, IsPositive } from 'class-validator';

export class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  customerId: string;
}
```

### 2. Create a Listener

```typescript
// order-created.listener.ts
import { Injectable } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { OrderCreatedEvent } from './order-created.event';

@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
  async onMessage(
    payload: OrderCreatedEvent,
    context: MessageContext
  ): Promise<void> {
    console.log(`Processing order ${payload.orderId} for $${payload.amount}`);
    
    // Your business logic here
    await this.processOrder(payload);
  }

  private async processOrder(order: OrderCreatedEvent): Promise<void> {
    // Implementation
  }
}
```

### 3. Configure the Container

```typescript
// order.module.ts
import { Module, Logger } from '@nestjs/common';
import { SQSClient } from '@aws-sdk/client-sqs';
import {
  NestJSSqsMessageListenerContainer,
  AcknowledgementMode,
} from '@snow-tzu/nest-sqs-listener';
import { OrderCreatedListener } from './order-created.listener';
import { OrderCreatedEvent } from './order-created.event';

@Module({
  providers: [
    OrderCreatedListener,
    {
      provide: 'SQS_CLIENT',
      useFactory: () => {
        return new SQSClient({
          region: process.env.AWS_REGION || 'us-east-1',
        });
      },
    },
    {
      provide: 'ORDER_LISTENER_CONTAINER',
      useFactory: (
        sqsClient: SQSClient,
        listener: OrderCreatedListener,
        logger: Logger
      ) => {
        const container = new NestJSSqsMessageListenerContainer<OrderCreatedEvent>(
          sqsClient,
          logger
        );

        container.configure(options => {
          options
            .queueName('order-queue')
            .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
            .maxConcurrentMessages(10)
            .pollTimeout(20);
        });

        container.setId('OrderListener');
        container.setMessageListener(listener);

        return container;
      },
      inject: ['SQS_CLIENT', OrderCreatedListener, Logger],
    },
  ],
})
export class OrderModule {}
```

## Migration Guide from 0.0.4

### Zero-Change Upgrade

The package maintains 100% backward compatibility. Simply upgrade the package version:

```bash
yarn upgrade @snow-tzu/nest-sqs-listener
```

Your existing code will continue to work without any changes:

```typescript
// This still works!
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
```

### Recommended: Use New Class Name

For clarity, we recommend updating to the new class name:

```typescript
// Before (still works)
import { SqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';

// After (recommended)
import { NestJSSqsMessageListenerContainer } from '@snow-tzu/nest-sqs-listener';
```

Both refer to the same class, so this is purely cosmetic.

## Configuration Options

### Container Configuration

```typescript
container.configure(options => {
  options
    .queueName('my-queue')                    // Required: Queue name or URL
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)  // When to delete messages
    .maxConcurrentMessages(10)                // Max parallel message processing
    .maxMessagesPerPoll(10)                   // Messages per SQS request
    .pollTimeout(20)                          // Long polling timeout (seconds)
    .visibilityTimeout(30)                    // Message visibility timeout
    .autoStartup(true);                       // Start on module init
});
```

### Acknowledgement Modes

- **`ON_SUCCESS`** - Delete message only after successful processing (default)
- **`ALWAYS`** - Delete message regardless of processing outcome
- **`MANUAL`** - Manual acknowledgement via `context.acknowledge()`

### Message Validation

Enable automatic validation with class-validator:

```typescript
import { ValidatingPayloadConverter } from '@snow-tzu/nest-sqs-listener';

container.configure(options => {
  options.messageConverter(
    new ValidatingPayloadConverter(OrderCreatedEvent, {
      validationFailureMode: ValidationFailureMode.LOG_AND_DELETE,
    })
  );
});
```

## Advanced Usage

### Custom Error Handler

```typescript
import { QueueListenerErrorHandler, MessageContext } from '@snow-tzu/nest-sqs-listener';

@Injectable()
export class CustomErrorHandler implements QueueListenerErrorHandler {
  async handleError(
    error: Error,
    message: any,
    context: MessageContext
  ): Promise<void> {
    // Custom error handling logic
    console.error(`Error processing message ${context.getMessageId()}:`, error);
    
    // Send to dead letter queue, log to monitoring service, etc.
  }
}

// In your module
container.setErrorHandler(customErrorHandler);
```

### Manual Acknowledgement

```typescript
container.configure(options => {
  options.acknowledgementMode(AcknowledgementMode.MANUAL);
});

// In your listener
async onMessage(payload: OrderCreatedEvent, context: MessageContext): Promise<void> {
  try {
    await this.processOrder(payload);
    await context.acknowledge(); // Manually delete message
  } catch (error) {
    // Message will remain in queue and be retried
    throw error;
  }
}
```

### Multiple Queues

```typescript
@Module({
  providers: [
    // Order queue container
    {
      provide: 'ORDER_CONTAINER',
      useFactory: (sqsClient, listener) => {
        const container = new NestJSSqsMessageListenerContainer(sqsClient);
        container.configure(options => options.queueName('order-queue'));
        container.setMessageListener(listener);
        return container;
      },
      inject: ['SQS_CLIENT', OrderListener],
    },
    // Notification queue container
    {
      provide: 'NOTIFICATION_CONTAINER',
      useFactory: (sqsClient, listener) => {
        const container = new NestJSSqsMessageListenerContainer(sqsClient);
        container.configure(options => options.queueName('notification-queue'));
        container.setMessageListener(listener);
        return container;
      },
      inject: ['SQS_CLIENT', NotificationListener],
    },
  ],
})
export class AppModule {}
```

## Lifecycle Hooks

The adapter automatically integrates with NestJS lifecycle:

- **`onModuleInit`** - Starts the container if `autoStartup` is enabled
- **`onModuleDestroy`** - Stops the container and waits for in-flight messages

### Manual Lifecycle Control

Disable auto-startup for manual control:

```typescript
container.configure(options => {
  options.autoStartup(false);
});

// Manually start/stop
await container.start();
await container.stop();
```

## Logging

The adapter uses NestJS Logger by default. You can provide a custom logger:

```typescript
const customLogger = new Logger('MyCustomContext');
const container = new NestJSSqsMessageListenerContainer(sqsClient, customLogger);
```

## Framework-Agnostic Core

This package is built on top of `@snow-tzu/sqs-listener`, a framework-agnostic core library. If you need to use the listener in a non-NestJS application (Express, Fastify, vanilla Node.js), install the core package directly:

```bash
npm install @snow-tzu/sqs-listener
```

See the [core package documentation](https://www.npmjs.com/package/@snow-tzu/sqs-listener) for framework-agnostic usage.

## Examples

Check out the [examples directory](../../examples) for complete working examples:

- **Basic NestJS** - Simple queue listener setup
- **Advanced NestJS** - Multiple queues, custom error handlers, validation
- **Vanilla Node.js** - Using the core package without a framework
- **Express** - Integration with Express applications

## API Reference

### NestJSSqsMessageListenerContainer

The main container class that extends `SqsMessageListenerContainer` from the core package.

#### Constructor

```typescript
constructor(sqsClient: SQSClient, logger?: Logger)
```

#### Methods

All methods from the core `SqsMessageListenerContainer` are available:

- `configure(callback: (options: ContainerOptions) => void): void`
- `setId(id: string): void`
- `setMessageListener(listener: QueueListener<T>): void`
- `setErrorHandler(handler: QueueListenerErrorHandler): void`
- `start(): Promise<void>`
- `stop(): Promise<void>`
- `isAutoStartupEnabled(): boolean`
- `isContainerRunning(): boolean`

### NestJSLoggerAdapter

Adapts NestJS Logger to the framework-agnostic LoggerInterface.

```typescript
const adapter = new NestJSLoggerAdapter(nestLogger);
```

## Contributing

Contributions are welcome! Please see the [main repository](https://github.com/ganesanarun/nest-sqs-listener) for contribution guidelines.

## License

MIT

## Support

- 📖 [Documentation](https://github.com/ganesanarun/nest-sqs-listener)
- 🐛 [Issue Tracker](https://github.com/ganesanarun/nest-sqs-listener/issues)
- 💬 [Discussions](https://github.com/ganesanarun/nest-sqs-listener/discussions)
