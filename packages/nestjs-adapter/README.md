# @snow-tzu/nest-sqs-listener

NestJS adapter for the framework-agnostic `@snow-tzu/sqs-listener` package. This adapter provides seamless integration
with NestJS's dependency injection system and lifecycle hooks.

## Features

- 🔄 **Automatic Lifecycle Management** - Integrates with NestJS module initialization and destruction
- 💉 **Dependency Injection** - Full support for NestJS DI with `@Injectable` decorator
- 📝 **NestJS Logger Integration** - Uses NestJS Logger for consistent logging
- 🔙 **100% Backward Compatible** - Drop-in replacement for version 0.0.4
- 🎯 **Type Safe** - Full TypeScript support with generics
- ✅ **Message Validation** - Built-in support for class-validator
- 🚀 **High Performance** - Efficient message processing with concurrency control

## Performance

This adapter provides the same high-performance characteristics as the core package:

- **Throughput**: ~500 msgs/sec at concurrency 20
- **Latency**: p95 < 310ms, p99 < 320ms
- **Memory Efficient**: ~12.3MB average increase with no memory leaks
- **Cost Optimized**: 10x fewer API calls with batch acknowledgements

For detailed performance analysis and benchmark results, see:

- [Core Package Performance Documentation](https://github.com/ganesanarun/sqs-listener/blob/main/README.md#performance)

## Batch Acknowledgements

Batch acknowledgements can reduce your AWS SQS API calls by up to 10x, providing significant cost savings and
performance improvements for high-volume NestJS applications.

### Quick Start

Enable batch acknowledgements in your NestJS module configuration:

```typescript
import {Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    NestJSSqsMessageListenerContainer,
    AcknowledgementMode,
} from '@snow-tzu/nest-sqs-listener';

@Module({
    providers: [
        OrderCreatedListener,
        {
            provide: 'SQS_CLIENT',
            useFactory: () => new SQSClient({region: 'us-east-1'}),
        },
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (listener, sqsClient) => {
                const container = new NestJSSqsMessageListenerContainer(sqsClient);

                container.configure(options => {
                    options
                        .queueName('order-queue')
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                        .enableBatchAcknowledgement(true)  // Enable batch acknowledgements
                        .batchAcknowledgementOptions(10, 100);  // maxSize: 10, flushInterval: 100ms
                });

                container.setMessageListener(listener);
                return container;
            },
            inject: [OrderCreatedListener, 'SQS_CLIENT'],
        },
    ],
})
export class OrderModule {
}
```

### Advanced Configuration

#### High-Volume Applications

For applications processing thousands of messages, maximize cost savings:

```typescript
import {Module} from '@nestjs/common';

@Module({
    providers: [
        {
            provide: 'HIGH_VOLUME_CONTAINER',
            useFactory:
                (listener, sqsClient, logger) => {
                    const container = new NestJSSqsMessageListenerContainer(sqsClient, logger);

                    container.configure(options => {
                        options
                            .queueName('high-volume-queue')
                            .maxConcurrentMessages(20)
                            .enableBatchAcknowledgement(true)
                            .batchAcknowledgementOptions(10, 200);  // Max batch size, longer wait
                    });
                    container.setMessageListener(listener);
                    return container;
                },
            inject: [HighVolumeListener, 'SQS_CLIENT', Logger],
        }]
})
```

#### Low-Latency Applications

For applications where acknowledgement latency matters:

```typescript
import {Module} from '@nestjs/common';

@Module({
    providers: [
        {
            provide: 'LOW_LATENCY_CONTAINER',
            useFactory:
                (listener, sqsClient, logger) => {
                    const container = new NestJSSqsMessageListenerContainer(sqsClient, logger);

                    container.configure(options => {
                        options
                            .queueName('low-latency-queue')
                            .enableBatchAcknowledgement(true)
                            .batchAcknowledgementOptions(5, 50);   // Smaller batches, faster flush
                    });

                    container.setMessageListener(listener);
                    return container;
                },
            inject: [LowLatencyListener, 'SQS_CLIENT', Logger],
        }]
})
```

### Multiple Queues with Different Batch Settings

Configure different batch acknowledgement settings for different queues:

```typescript

@Module({
    providers: [
        // High-volume order processing
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (listener, sqsClient) => {
                const container = new NestJSSqsMessageListenerContainer(sqsClient);
                container.configure(options => {
                    options
                        .queueName('order-queue')
                        .enableBatchAcknowledgement(true)
                        .batchAcknowledgementOptions(10, 100);  // Standard batching
                });
                container.setMessageListener(listener);
                return container;
            },
            inject: [OrderListener, 'SQS_CLIENT'],
        },

        // Critical notifications (low latency)
        {
            provide: 'NOTIFICATION_CONTAINER',
            useFactory: (listener, sqsClient) => {
                const container = new NestJSSqsMessageListenerContainer(sqsClient);
                container.configure(options => {
                    options
                        .queueName('notification-queue')
                        .enableBatchAcknowledgement(true)
                        .batchAcknowledgementOptions(3, 25);   // Small batches, fast flush
                });
                container.setMessageListener(listener);
                return container;
            },
            inject: [NotificationListener, 'SQS_CLIENT'],
        },
    ],
})
export class MessagingModule {
}
```

### Manual Acknowledgement with Batching

Combine manual acknowledgement with batch processing for fine-grained control:

```typescript

@Injectable()
export class TransactionalOrderListener implements QueueListener<OrderCreatedEvent> {
    constructor(
        private readonly orderService: OrderService,
        private readonly paymentService: PaymentService,
        private readonly logger: Logger
    ) {
    }

    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        try {
            // Start database transaction
            await this.orderService.beginTransaction();

            // Process order
            await this.orderService.createOrder(event);

            // Process payment
            await this.paymentService.processPayment(event);

            // Commit transaction
            await this.orderService.commitTransaction();

            // Acknowledge only after successful transaction
            await context.acknowledge();  // Batched automatically

            this.logger.log(`Order ${event.orderId} processed successfully`);
        } catch (error) {
            await this.orderService.rollbackTransaction();
            this.logger.error(`Order ${event.orderId} failed: ${error.message}`);
            throw error; // Don't acknowledge - message will retry
        }
    }
}

// Configure container for manual acknowledgement with batching
@Module({
    providers: [
        {
            provide: 'TRANSACTIONAL_CONTAINER',
            useFactory:
                (listener, sqsClient) => {
                    const container = new NestJSSqsMessageListenerContainer(sqsClient);

                    container.configure(options => {
                        options
                            .queueName('transactional-queue')
                            .acknowledgementMode(AcknowledgementMode.MANUAL)  // Manual control
                            .enableBatchAcknowledgement(true);                // But still batch
                    });

                    container.setMessageListener(listener);
                    return container;
                },
            inject: [TransactionalOrderListener, 'SQS_CLIENT'],
        }]
})
```

### Monitoring Batch Performance

Use NestJS Logger to monitor batch acknowledgement performance:

```typescript
import {Logger} from '@nestjs/common';

@Injectable()
export class BatchMonitoringListener implements QueueListener<MyEvent> {
    private processedCount = 0;
    private startTime = Date.now();

    constructor(private readonly logger: Logger) {
    }

    async onMessage(event: MyEvent, context: MessageContext): Promise<void> {
        await this.processEvent(event);

        this.processedCount++;

        // Log batch efficiency every 100 messages
        if (this.processedCount % 100 === 0) {
            const elapsed = Date.now() - this.startTime;
            const rate = (this.processedCount / elapsed) * 1000; // messages per second

            this.logger.log(`Processed ${this.processedCount} messages at ${rate.toFixed(2)} msg/sec`);
        }
    }
}
```

### Performance Benefits for NestJS Applications

#### Cost Savings Example

For a NestJS microservice processing 1 million messages per day:

| Configuration    | API Calls/Day | Cost/Day* | Annual Savings |
|------------------|---------------|-----------|----------------|
| Without Batching | 1,000,000     | $0.40     | -              |
| With Batching    | ~100,000      | $0.04     | ~$131          |

*Based on $0.0000004 per SQS request

#### Integration with NestJS Features

Batch acknowledgements work seamlessly with all NestJS features:

- ✅ **Dependency Injection**: Inject services into listeners as usual
- ✅ **Lifecycle Hooks**: Automatic startup/shutdown with module lifecycle
- ✅ **Logger Integration**: Uses NestJS Logger for batch operation logging
- ✅ **Error Handling**: Works with custom error handlers and validation
- ✅ **Testing**: Mock and test listeners normally - batching is transparent

### Best Practices for NestJS

1. **Enable for Production**: Always enable batch acknowledgements for production high-volume queues
2. **Use Dependency Injection**: Inject batch-enabled containers as providers
3. **Monitor Performance**: Use NestJS Logger to track batch efficiency
4. **Configure Per Queue**: Different queues may need different batch settings
5. **Test Gracefully**: Ensure your tests properly shut down containers

For comprehensive batch acknowledgement documentation, see
the [Core Package Batch Acknowledgement Guide](../core/docs/BATCH_ACKNOWLEDGEMENT.md).

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
import {IsString, IsNumber, IsPositive} from 'class-validator';

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
import {Injectable} from '@nestjs/common';
import {QueueListener, MessageContext} from '@snow-tzu/nest-sqs-listener';
import {OrderCreatedEvent} from './order-created.event';

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
import {Module, Logger} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    NestJSSqsMessageListenerContainer,
    AcknowledgementMode,
} from '@snow-tzu/nest-sqs-listener';
import {OrderCreatedListener} from './order-created.listener';
import {OrderCreatedEvent} from './order-created.event';

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
export class OrderModule {
}
```

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
import {ValidatingPayloadConverter} from '@snow-tzu/nest-sqs-listener';

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
import {QueueListenerErrorHandler, MessageContext} from '@snow-tzu/nest-sqs-listener';

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
export class AppModule {
}
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

This package is built on top of `@snow-tzu/sqs-listener`, a framework-agnostic core library. If you need to use the
listener in a non-NestJS application (Express, Fastify, vanilla Node.js), install the core package directly:

```bash
npm install @snow-tzu/sqs-listener
```

See the [core package documentation](https://www.npmjs.com/package/@snow-tzu/sqs-listener) for framework-agnostic usage
and for detailed configuration options.

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

```
constructor(sqsClient:SQSClient, logger ? : Logger)
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

Contributions are welcome! Please see the [main repository](https://github.com/ganesanarun/nest-sqs-listener) for
contribution guidelines.

## License

MIT

## Support

- 📖 [Documentation](https://github.com/ganesanarun/sqs-listener)
- 🐛 [Issue Tracker](https://github.com/ganesanarun/sqs-listener/issues)
- 💬 [Discussions](https://github.com/ganesanarun/sqs-listener/discussions)
