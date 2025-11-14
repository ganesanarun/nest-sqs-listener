# NestJS SQS Listener

[![npm version](https://img.shields.io/npm/v/@snow-tzu/nest-sqs-listener.svg)](https://www.npmjs.com/package/@snow-tzu/nest-sqs-listener) [![build](https://github.com/ganesanarun/nest-sqs-listener/actions/workflows/build.yml/badge.svg)](https://github.com/ganesanarun/nest-sqs-listener/actions/workflows/build.yml)

## Introduction

NestJS SQS Listener is a flexible, type-safe package for consuming messages from AWS SQS queues in NestJS applications. It abstracts infrastructure concerns, allowing you to focus on business logic and domain events, not AWS SDK details or error handling boilerplate.

## Features

- 🚀 **Infrastructure abstraction** - Focus on business logic while the package handles all SQS infrastructure concerns
- 💉 **Full NestJS integration** - Leverage dependency injection and lifecycle hooks for seamless integration
- 🔒 **Type-safe** - Generic types throughout for compile-time safety and better developer experience
- 🎯 **Flexible acknowledgement** - Choose between ON_SUCCESS, MANUAL, or ALWAYS acknowledgement modes
- 🔄 **Concurrency control** - Configurable parallel message processing with semaphore-based limits
- 🛠️ **Highly customizable** - Bring your own message converters, error handlers
- ✅ **Testable** - All components are injectable and mockable for easy unit and integration testing

## Table of Contents

- [Installation](#installation)
- [Why This Package?](#why-this-package)
- [Comparison](#comparison)
- [Core Concepts](#core-concepts)
- [Extensibility & Decorators](#extensibility--decorators)
- [Getting Started](#getting-started)
- [Validation](#validation)
- [Configuration & Acknowledgement](#configuration--acknowledgement)
- [Best Practices](#best-practices)
- [Advanced Usage](#advanced-usage)
- [Examples](#examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [License](#license)

## Installation

```bash
npm install @snow-tzu/nest-sqs-listener @aws-sdk/client-sqs
```

### Optional: Validation Support

For automatic message validation using decorators, install class-validator as a peer dependency:

```bash
npm install class-validator class-transformer
```

Note: class-transformer is already used internally for type conversion, but you may need to install it explicitly if not already in your project.

## Why This Package?

Existing solutions for SQS message consumption (AWS SDK, bbc/sqs-consumer, @ssut/nestjs-sqs) often:
- Mix infrastructure logic with business code
- Require manual parsing and error handling
- Are tightly coupled to AWS SDK types (e.g., SQS Message)
- Lack of strong typing and validation
- Offer limited extensibility and testability

This package was created to solve these pain points by:
- Abstracting all infrastructure concerns
- Providing a decorator-friendly, type-safe listener interface
- Supporting custom converters and error handlers
- Enabling centralized error handling and flexible acknowledgement modes
- Integrating seamlessly with NestJS DI and lifecycle hooks

## Comparison

| Capability              | AWS SDK (raw)    | bbc/sqs-consumer | @ssut/nestjs-sqs | @snow-tzu/nest-sqs-listener |
|-------------------------|------------------|------------------|------------------|-----------------------------|
| Listener Payload        | Raw JSON         | Raw JSON         | Raw SQS Message  | Strong Domain Event         |
| Parsing                 | Manual           | Manual           | Manual           | Automatic via converter     |
| Type Safety             | ❌ None          | ❌ None          | ⚠️ Weak          | ✅ Strong                   |
| NestJS DI Integration   | ❌ No            | ❌ No            | ✅ Partial       | ✅ Full                     |
| Architecture Separation | ❌ Poor          | ❌ Poor          | ⚠️ Partial       | ✅ Clean                    |
| Decorator-Friendly      | ❌ No            | ❌ No            | ❌ No            | ✅ Yes                      |
| Ack Modes               | Manual only      | Auto only        | Auto only        | ON_SUCCESS / ALWAYS / MANUAL|
| Centralized Errors      | ❌ No            | ⚠️ Limited       | ❌ No            | ✅ Yes                      |
| Custom Converters       | ❌ No            | ❌ No            | ❌ No            | ✅ Yes                      |
| Concurrency Control     | Manual           | ✅ Yes           | ✅ Yes           | ✅ Yes                      |
| Testability             | Poor             | Hard             | Limited          | ✅ Excellent                |
| Extensibility           | Low              | Low              | Low              | High                        |

## Core Concepts

#### SqsMessageListenerContainer

The main container class that manages the complete lifecycle of message consumption for a single queue. Each container:
- Polls an SQS queue using long polling
- Converts raw messages to typed payloads
- Validates messages (optional, using class-validator)
- Invokes your listener with the typed message
- Handles acknowledgement based on configured mode
- Manages concurrency limits
- Handles errors via error handlers

#### QueueListener Interface

```typescript
interface QueueListener<T> {
  onMessage(payload: T, context: MessageContext): Promise<void>;
}
```

#### MessageContext

```typescript
interface MessageContext {
  getMessageId(): string;
  getReceiptHandle(): string;
  getQueueUrl(): string;
  getMessageAttributes(): SQSMessageAttributes;
  getSystemAttributes(): Record<string, string>;
  getApproximateReceiveCount(): number;
  acknowledge(): Promise<void>; // For MANUAL mode
}
```

## Validation

This package integrates seamlessly with [class-validator](https://github.com/typestack/class-validator) to automatically validate incoming SQS messages against your business rules. When enabled, messages are validated before reaching your listener, ensuring your business logic only processes valid data.

### Why Validation?

- **Data Integrity**: Ensure messages meet your business rules before processing
- **Early Error Detection**: Catch invalid messages before they cause runtime errors
- **Clear Error Messages**: Get detailed validation failures for debugging
- **Flexible Error Handling**: Choose how to handle invalid messages (throw, acknowledge, or reject)
- **Type Safety**: Leverage TypeScript decorators for compile-time and runtime validation

### Basic Validation Example

#### 1. Define your event class with validation decorators

```typescript
import { IsString, IsNumber, IsPositive, IsEmail, Min, Max } from 'class-validator';

export class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsEmail()
  customerEmail: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  discountPercent: number;
}
```

#### 2. Enable validation in your container configuration

```typescript
import { ValidationFailureMode } from '@snow-tzu/nest-sqs-listener';

container.configure(options => {
  options
    .queueName('order-created-queue')
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.THROW)
    .validatorOptions({
      whitelist: true,              // Strip non-decorated properties
      forbidNonWhitelisted: true,   // Reject messages with unexpected properties
    });
});
```

#### 3. Your listener receives only validated messages

```typescript
@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
  async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
    // message is guaranteed to be valid - no need for manual validation!
    await this.orderService.processOrder(message);
  }
}
```

### Validation Failure Modes

Control what happens when a message fails validation:

#### THROW (Default)

Throws an error and invokes your error handler. The message remains in the queue for retry.

```typescript
.validationFailureMode(ValidationFailureMode.THROW)
```

**Use when:**
- You want to handle validation errors in your error handler
- Invalid messages might become valid after a system fix
- You want validation errors to follow your standard error handling flow

#### ACKNOWLEDGE

Logs the validation error and immediately removes the message from the queue. Your listener is never invoked.

```typescript
.validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
```

**Use when:**
- Invalid messages will never become valid (bad data from source)
- You want to discard invalid messages to prevent queue blocking
- You're monitoring logs for validation failures

#### REJECT

Logs the validation error but doesn't acknowledge the message. The message will retry and eventually move to your dead-letter queue.

```typescript
.validationFailureMode(ValidationFailureMode.REJECT)
```

**Use when:**
- You want invalid messages to go to a dead-letter queue for analysis
- You don't want to invoke error handler overhead for validation failures
- You're using a separate process to handle DLQ messages

### Validation Options

Pass any [class-validator ValidatorOptions](https://github.com/typestack/class-validator#passing-options) to customize validation behavior:

```typescript
container.configure(options => {
  options
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validatorOptions({
      skipMissingProperties: false,    // Validate all properties
      whitelist: true,                 // Strip properties without decorators
      forbidNonWhitelisted: true,      // Throw error for unexpected properties
      forbidUnknownValues: true,       // Throw error for unknown objects
      groups: ['create'],              // Only validate 'create' group
      dismissDefaultMessages: false,   // Include default error messages
      validationError: {
        target: false,                 // Don't include target in error
        value: true,                   // Include value in error
      },
    });
});
```

### Nested Object Validation

Validate complex nested structures using `@ValidateNested()` and `@Type()`:

```typescript
import { IsString, IsNumber, IsPositive, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderItem {
  @IsString()
  productId: string;

  @IsNumber()
  @IsPositive()
  quantity: number;

  @IsNumber()
  @IsPositive()
  price: number;
}

export class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  items: OrderItem[];

  @IsNumber()
  @IsPositive()
  totalAmount: number;
}
```

### Validation with Custom Converters

If you're using a custom message converter (XML, Protobuf, etc.), you can still add validation using the `ValidatingPayloadConverter` decorator:

```typescript
import { ValidatingPayloadConverter, ValidationFailureMode } from '@snow-tzu/nest-sqs-listener';

// Your custom converter
class XmlOrderConverter implements PayloadMessagingConverter<OrderCreatedEvent> {
  convert(body: string): OrderCreatedEvent {
    return this.parseXmlToOrder(body);
  }
}

// Wrap with validation
const xmlConverter = new XmlOrderConverter();
const validatingConverter = new ValidatingPayloadConverter(
  xmlConverter,
  OrderCreatedEvent,
  {
    enableValidation: true,
    validationFailureMode: ValidationFailureMode.THROW,
    validatorOptions: { whitelist: true }
  },
  logger  // Optional logger for ACKNOWLEDGE/REJECT modes
);

container.configure(options => {
  options
    .queueName('order-queue')
    .messageConverter(validatingConverter);
});
```

**How it works:**
1. Your custom converter transforms the message (XML → object)
2. ValidatingPayloadConverter ensures it's a class instance
3. class-validator validates the instance
4. Your listener receives the validated message

This pattern works with any converter format: XML, Protobuf, Avro, CSV, etc.

### Configuration Examples

#### Simple validation with defaults

```typescript
container.configure(options => {
  options
    .queueName('order-queue')
    .targetClass(OrderCreatedEvent)
    .enableValidation(true);
  // Uses THROW mode by default
});
```

#### Strict validation with whitelist

```typescript
container.configure(options => {
  options
    .queueName('order-queue')
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
    .validatorOptions({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
});
```

#### Validation with custom converter (automatic wrapping)

```typescript
const customConverter = new XmlOrderConverter();

container.configure(options => {
  options
    .queueName('order-queue')
    .messageConverter(customConverter)
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.REJECT);
  // Container automatically wraps customConverter with ValidatingPayloadConverter
});
```

### Graceful Degradation

Validation is designed to fail gracefully:

- **class-validator not installed**: Validation is skipped, messages are processed normally
- **No decorators on class**: Validation passes, messages are processed normally
- **Validation explicitly disabled**: Validation is skipped entirely

This ensures your application continues to work even if validation dependencies are missing.

## Configuration & Acknowledgement

### Container Configuration

```typescript
container.configure(options => {
  options
    .queueName('my-queue')
    .pollTimeout(20)
    .visibilityTimeout(30)
    .maxConcurrentMessages(10)
    .maxMessagesPerPoll(10)
    .autoStartup(true)
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
    .messageConverter(customConverter)
    // Validation options
    .targetClass(MyEventClass)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.THROW)
    .validatorOptions({ whitelist: true });
});
```

**Configuration Methods:**
- `queueName(name: string)` - Queue name to consume from
- `pollTimeout(seconds: number)` - Long polling timeout (0-20 seconds)
- `visibilityTimeout(seconds: number)` - Message visibility timeout
- `maxConcurrentMessages(count: number)` - Maximum parallel message processing
- `maxMessagesPerPoll(count: number)` - Maximum messages per poll (1-10)
- `autoStartup(enabled: boolean)` - Start automatically on application startup
- `acknowledgementMode(mode: AcknowledgementMode)` - Message acknowledgement behavior
- `messageConverter(converter: PayloadMessagingConverter<T>)` - Custom message converter
- `targetClass(type: Type<T>)` - Target class for transformation and validation
- `enableValidation(enabled: boolean)` - Enable class-validator validation
- `validationFailureMode(mode: ValidationFailureMode)` - Validation failure behavior
- `validatorOptions(options: ValidatorOptions)` - class-validator options

### Acknowledgement Modes

**ON_SUCCESS** (Default)
- Deletes message only if `onMessage()` completes successfully
- If error occurs, message remains in queue for retry

**MANUAL**
- Never automatically deletes messages
- Application must call `context.acknowledge()` explicitly
- Useful for complex workflows or transactional processing

**ALWAYS**
- Always deletes message, even if processing fails
- Useful for non-critical messages or when using external DLQ

## Extensibility & Decorators

This package focuses on SQS message consumption and does not include built-in tracing or observability features. Instead, you can implement your own decorators to add cross-cutting concerns like tracing, metrics, or logging.

### Why Use Decorators?

Decorators allow you to:
- Keep business logic clean and focused
- Use any observability tool (OpenTelemetry, New Relic, Datadog, etc.)
- Compose multiple decorators together
- Test business logic without tracing overhead
- Add or remove concerns without modifying core code

### Example: Tracing Decorator

```typescript
import { Injectable } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { trace, context as otContext, SpanStatusCode } from '@opentelemetry/api';

export class TracingListener<T> implements QueueListener<T> {
  constructor(private readonly listener: QueueListener<T>) {}

  async onMessage(payload: T, context: MessageContext): Promise<void> {
    const tracer = trace.getTracer('sqs-listener');
    const span = tracer.startSpan('sqs.consume', {
      attributes: {
        'messaging.system': 'aws_sqs',
        'messaging.destination': context.getQueueUrl(),
        'messaging.message_id': context.getMessageId(),
      },
    });
    
    try {
      await otContext.with(trace.setSpan(otContext.active(), span), async () => {
        await this.listener.onMessage(payload, context);
      });
      span.setStatus({ code: SpanStatusCode.OK });
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  }
}
```

### Usage

```typescript
// Create business logic listener
const businessListener = new OrderCreatedListener(orderService);

// Wrap with tracing decorator
const tracingListener = new TracingListener(businessListener);

// Register decorated listener with container
container.setMessageListener(tracingListener);
```

### Composing Multiple Decorators

You can chain multiple decorators together:

```typescript
// Logging decorator
export class LoggingListener<T> implements QueueListener<T> {
  constructor(
    private readonly listener: QueueListener<T>,
    private readonly logger: Logger
  ) {}

  async onMessage(payload: T, context: MessageContext): Promise<void> {
    this.logger.log(`Processing message: ${context.getMessageId()}`);
    const start = Date.now();
    
    try {
      await this.listener.onMessage(payload, context);
      this.logger.log(`Completed in ${Date.now() - start}ms`);
    } catch (error) {
      this.logger.error(`Failed after ${Date.now() - start}ms`, error);
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

// Compose decorators
const businessListener = new OrderCreatedListener(orderService);
const withLogging = new LoggingListener(businessListener, logger);
const withMetrics = new MetricsListener(withLogging, metricsService);
const withTracing = new TracingListener(withMetrics);

container.setMessageListener(withTracing);
```

See the [advanced example](./examples/advanced) for a complete implementation with OpenTelemetry.

## Best Practices

### Use Symbols for Dependency Injection Tokens

For type safety and to prevent naming collisions, use Symbols instead of strings for provider tokens:

```typescript
// tokens.ts
export const ORDER_SQS_CLIENT = Symbol('ORDER_SQS_CLIENT');
export const ORDER_CONTAINER = Symbol('ORDER_CONTAINER');
export const NOTIFICATION_SQS_CLIENT = Symbol('NOTIFICATION_SQS_CLIENT');
export const NOTIFICATION_CONTAINER = Symbol('NOTIFICATION_CONTAINER');

// module.ts
@Module({
  providers: [
    {
      provide: ORDER_SQS_CLIENT,
      useFactory: () => new SQSClient({ region: 'us-east-1' }),
    },
    {
      provide: ORDER_CONTAINER,
      useFactory: (listener, sqsClient) => {
        const container = new SqsMessageListenerContainer(sqsClient);
        // ... configuration
        return container;
      },
      inject: [OrderCreatedListener, ORDER_SQS_CLIENT],
    },
  ],
})
export class OrderModule {}
```

**Benefits:**
- Compile-time type safety (no string typos)
- Prevents naming collisions between modules
- Better IDE support and refactoring
- Clear intent and self-documenting code
- Essential when working with multiple AWS accounts or containers

This pattern is especially important when connecting to multiple AWS accounts:

```typescript
// Primary AWS account for orders
{
  provide: ORDER_SQS_CLIENT,
  useFactory: () => new SQSClient({
    region: process.env.ORDER_AWS_REGION,
    credentials: {
      accessKeyId: process.env.ORDER_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.ORDER_AWS_SECRET_ACCESS_KEY,
    },
  }),
}

// Secondary AWS account for notifications
{
  provide: NOTIFICATION_SQS_CLIENT,
  useFactory: () => new SQSClient({
    region: process.env.NOTIFICATION_AWS_REGION,
    credentials: {
      accessKeyId: process.env.NOTIFICATION_AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.NOTIFICATION_AWS_SECRET_ACCESS_KEY,
    },
  }),
}
```

See the [advanced example](./examples/advanced) for a complete implementation.

## Advanced Usage

### Custom Error Handlers

Implement custom error handling logic:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { QueueListenerErrorHandler, MessageContext } from 'nest-sqs-listener';

@Injectable()
export class OrderErrorHandler implements QueueListenerErrorHandler {
  constructor(private readonly logger: Logger) {}
  
  async handleError(error: Error, message: any, context: MessageContext): Promise<void> {
    this.logger.error(`Error processing order: ${error.message}`, error.stack);
    
    // Custom logic based on error type
    if (error.name === 'ValidationError') {
      // Remove invalid messages from queue
      await context.acknowledge();
    } else if (error.name === 'TemporaryError') {
      // Let it retry (don't acknowledge)
      return;
    } else {
      // Send to monitoring system
      await this.sendToMonitoring(error, context);
    }
  }
}

// Register with container:
container.setErrorHandler(errorHandler);
```


### Custom Message Converters

Implement custom message parsing logic:

```typescript
import { Injectable } from '@nestjs/common';
import { PayloadMessagingConverter } from 'nest-sqs-listener';

@Injectable()
export class XmlOrderConverter implements PayloadMessagingConverter<OrderEvent> {
  convert(body: string, attributes: SQSMessageAttributes): OrderEvent {
    // Parse XML and return typed object
    return this.parseXmlToOrder(body);
  }
}

// Register with container:
container.configure(options => {
  options.messageConverter(new XmlOrderConverter());
});
```

### Multiple Queues and Regions

Configure multiple containers for different queues and regions:

```typescript
@Module({
  providers: [
    // US East SQS Client
    {
      provide: 'US_EAST_SQS_CLIENT',
      useFactory: () => new SQSClient({ region: 'us-east-1' }),
    },
    // EU West SQS Client
    {
      provide: 'EU_WEST_SQS_CLIENT',
      useFactory: () => new SQSClient({ region: 'eu-west-1' }),
    },
    
    // US Container
    {
      provide: 'US_ORDER_CONTAINER',
      useFactory: (listener, sqsClient) => {
        const container = new SqsMessageListenerContainer<OrderEvent>(sqsClient);
        container.configure(options => options.queueName('us-orders'));
        container.setId('usOrderListener');
        container.setMessageListener(listener);
        return container;
      },
      inject: [OrderListener, 'US_EAST_SQS_CLIENT']
    },
    
    // EU Container
    {
      provide: 'EU_ORDER_CONTAINER',
      useFactory: (listener, sqsClient) => {
        const container = new SqsMessageListenerContainer<OrderEvent>(sqsClient);
        container.configure(options => options.queueName('eu-orders'));
        container.setId('euOrderListener');
        container.setMessageListener(listener);
        return container;
      },
      inject: [OrderListener, 'EU_WEST_SQS_CLIENT']
    },
  ]
})
export class OrderModule {}
```

## Examples

Check out the [examples directory](./examples) for complete, runnable applications demonstrating various features and patterns:

### [Basic Example](./examples/basic) ⭐

Get started quickly with a minimal setup showing core functionality.

**What you'll learn:**
- Single queue listener configuration
- Automatic acknowledgement (ON_SUCCESS mode)
- Basic business logic separation
- Message validation with class-validator
- LocalStack setup for local testing

**Perfect for:** First-time users, simple use cases, learning the basics

### [Advanced Example](./examples/advanced) ⭐⭐⭐

Learn production-ready patterns and sophisticated features.

**What you'll learn:**
- **Listener decorator pattern** for adding tracing, logging, and metrics
- **OpenTelemetry distributed tracing** implementation
- **Custom error handling** with retry logic
- **Manual acknowledgement** for fine-grained control
- **Multiple queue listeners** with different configurations
- **Multiple AWS account connections** using separate SQS clients
- **Symbol-based dependency injection** for type safety
- **Advanced validation patterns** with different failure modes

**Perfect for:** Production applications, complex workflows, advanced patterns

### [Validation Examples](./examples/VALIDATION_EXAMPLES.md) 📋

Comprehensive guide to message validation with class-validator.

**What you'll learn:**
- Basic validation setup with decorators
- Three validation failure modes (THROW, ACKNOWLEDGE, REJECT)
- Nested object and array validation
- Custom validators and conditional validation
- Handling validation errors in error handlers
- Testing validation with invalid messages

**Perfect for:** Understanding validation features, implementing data integrity checks

### Running Examples Locally

All examples include LocalStack setup for testing without AWS credentials:

```bash
cd examples
docker-compose up -d
./scripts/setup-queues.sh

cd basic  # or advanced
npm install
cp .env.example .env
npm run start:dev

# In another terminal
cd examples
./scripts/send-test-messages.sh localstack
```

See the [examples README](./examples/README.md) for detailed instructions.

## Testing

### Unit Testing Listeners

```typescript
import { Test } from '@nestjs/testing';
import { OrderCreatedListener } from './order-created.listener';
import { OrderService } from './order.service';
import { MessageContext } from 'nest-sqs-listener';

describe('OrderCreatedListener', () => {
  let listener: OrderCreatedListener;
  let orderService: jest.Mocked<OrderService>;
  let context: jest.Mocked<MessageContext>;
  
  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        OrderCreatedListener,
        {
          provide: OrderService,
          useValue: {
            processNewOrder: jest.fn(),
          },
        },
      ],
    }).compile();
    
    listener = module.get(OrderCreatedListener);
    orderService = module.get(OrderService);
    
    context = {
      getMessageId: jest.fn().mockReturnValue('msg-123'),
      getReceiptHandle: jest.fn().mockReturnValue('handle-123'),
      acknowledge: jest.fn(),
    } as any;
  });
  
  it('should process order successfully', async () => {
    const payload = { orderId: '123', customerId: '456', amount: 100 };
    
    await listener.onMessage(payload, context);
    
    expect(orderService.processNewOrder).toHaveBeenCalledWith(payload);
  });
});
```

### Integration Testing with Mock SQSClient

```typescript
import { Test } from '@nestjs/testing';
import { SqsMessageListenerContainer } from 'nest-sqs-listener';
import { SQSClient, ReceiveMessageCommand } from '@aws-sdk/client-sqs';
import { mockClient } from 'aws-sdk-client-mock';

describe('SqsMessageListenerContainer Integration', () => {
  let container: SqsMessageListenerContainer<OrderEvent>;
  let sqsClientMock;
  let listener: jest.Mocked<QueueListener<OrderEvent>>;
  
  beforeEach(() => {
    sqsClientMock = mockClient(SQSClient);
    listener = {
      onMessage: jest.fn(),
    };
    
    container = new SqsMessageListenerContainer(new SQSClient({}));
    container.configure(options => {
      options
        .queueName('test-queue')
        .autoStartup(false);
    });
    container.setMessageListener(listener);
  });
  
  it('should receive and process messages', async () => {
    sqsClientMock.on(ReceiveMessageCommand).resolves({
      Messages: [{
        MessageId: '123',
        ReceiptHandle: 'handle-123',
        Body: JSON.stringify({ orderId: '456', customerId: '789', amount: 100 }),
      }]
    });
    
    await container.start();
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for processing
    
    expect(listener.onMessage).toHaveBeenCalledWith(
      { orderId: '456', customerId: '789', amount: 100 },
      expect.any(Object)
    );
    
    await container.stop();
  });
});
```

### E2E Testing with LocalStack

```typescript
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { SQSClient, CreateQueueCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { AppModule } from './app.module';

describe('E2E with LocalStack', () => {
  let app: INestApplication;
  let sqsClient: SQSClient;
  let queueUrl: string;
  
  beforeAll(async () => {
    sqsClient = new SQSClient({
      region: 'us-east-1',
      endpoint: 'http://localhost:4566', // LocalStack endpoint
      credentials: {
        accessKeyId: 'test',
        secretAccessKey: 'test',
      },
    });
    
    // Create test queue
    const result = await sqsClient.send(new CreateQueueCommand({
      QueueName: 'test-queue'
    }));
    queueUrl = result.QueueUrl;
    
    // Start NestJS app
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    
    app = module.createNestApplication();
    await app.init();
  });
  
  afterAll(async () => {
    await app.close();
  });
  
  it('should process messages end-to-end', async () => {
    // Send message to queue
    await sqsClient.send(new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify({ orderId: '789', customerId: '123', amount: 50 }),
    }));
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Verify message was processed (check database, mock service calls, etc.)
  });
});
```

## API Reference

### Classes

#### SqsMessageListenerContainer<T>

Main container class for managing message consumption.

**Constructor:**
```typescript
constructor(sqsClient: SQSClient)
```

**Methods:**
- `configure(callback: (options: ContainerOptions) => void): void` - Configure container options
- `setId(id: string): void` - Set container identifier
- `setMessageListener(listener: QueueListener<T>): void` - Set message listener
- `setErrorHandler(handler: QueueListenerErrorHandler): void` - Set error handler
- `start(): Promise<void>` - Manually start the container
- `stop(): Promise<void>` - Manually stop the container

#### JsonPayloadMessagingConverter<T>

Default JSON message converter with optional validation support.

**Constructor:**
```typescript
constructor(
  targetClass?: Type<T>,
  options?: JsonPayloadConverterOptions,
  logger?: Logger
)
```

**Options:**
```typescript
interface JsonPayloadConverterOptions {
  enableValidation?: boolean;
  validationFailureMode?: ValidationFailureMode;
  validatorOptions?: ValidatorOptions;
}
```

#### ValidatingPayloadConverter<T>

Decorator that wraps any PayloadMessagingConverter to add validation capabilities.

**Constructor:**
```typescript
constructor(
  innerConverter: PayloadMessagingConverter<T>,
  targetClass: Type<T>,
  options?: JsonPayloadConverterOptions,
  logger?: Logger
)
```

**Usage:**
```typescript
const xmlConverter = new XmlPayloadConverter();
const validatingConverter = new ValidatingPayloadConverter(
  xmlConverter,
  OrderCreatedEvent,
  { enableValidation: true }
);
```

#### MessageValidationError

Error thrown when message validation fails (in THROW mode).

**Properties:**
- `message: string` - Human-readable error summary
- `validationErrors: ValidationError[]` - Array of class-validator errors
- `originalBody: string` - Raw message body for debugging
- `targetClass: string` - Class name that failed validation

**Methods:**
- `getConstraints()` - Get all constraint failures as flat array
- `getFormattedErrors()` - Get formatted error messages

#### DefaultQueueListenerErrorHandler

Default error handler that logs errors.

**Constructor:**
```typescript
constructor(logger: Logger)
```

### Interfaces

#### QueueListener<T>

```typescript
interface QueueListener<T> {
  onMessage(payload: T, context: MessageContext): Promise<void>;
}
```

#### MessageContext

```typescript
interface MessageContext {
  getMessageId(): string;
  getReceiptHandle(): string;
  getQueueUrl(): string;
  getMessageAttributes(): SQSMessageAttributes;
  getSystemAttributes(): Record<string, string>;
  getApproximateReceiveCount(): number;
  acknowledge(): Promise<void>;
}
```

#### QueueListenerErrorHandler

```typescript
interface QueueListenerErrorHandler {
  handleError(error: Error, message: any, context: MessageContext): Promise<void>;
}
```

#### PayloadMessagingConverter<T>

```typescript
interface PayloadMessagingConverter<T> {
  convert(
    body: string, 
    attributes: SQSMessageAttributes,
    context?: MessageContext
  ): Promise<T> | T;
}
```

Note: The `context` parameter is optional for backward compatibility but required for validation in ACKNOWLEDGE/REJECT modes.

### Enums

#### AcknowledgementMode

```typescript
enum AcknowledgementMode {
  ON_SUCCESS = 'ON_SUCCESS',
  MANUAL = 'MANUAL',
  ALWAYS = 'ALWAYS',
}
```

#### ValidationFailureMode

```typescript
enum ValidationFailureMode {
  THROW = 'THROW',        // Throw error and invoke error handler (default)
  ACKNOWLEDGE = 'ACKNOWLEDGE',  // Log error and remove message from queue
  REJECT = 'REJECT',      // Log error, don't acknowledge (message retries)
}
```

## Troubleshooting

### Messages are not being received

**Check:**
1. Verify SQSClient credentials and region are correct
2. Ensure queue name or URL is correct
3. Check that `autoStartup` is set to `true` or manually call `start()`
4. Verify IAM permissions include `sqs:ReceiveMessage`, `sqs:DeleteMessage`, and `sqs:GetQueueUrl`
5. Check CloudWatch logs for any AWS SDK errors

### Messages are being processed multiple times

**Possible causes:**
1. `visibilityTimeout` is too short - increase it to give processing more time
2. Processing is taking longer than visibility timeout
3. Acknowledgement mode is set to `MANUAL` but `acknowledge()` is not being called
4. Error in listener is preventing acknowledgement in `ON_SUCCESS` mode

**Solutions:**
- Increase `visibilityTimeout` to match your processing time
- Use `MANUAL` mode and call `acknowledge()` only after successful processing
- Implement proper error handling

### High memory usage

**Possible causes:**
1. `maxConcurrentMessages` is too high
2. Messages are large and many are being processed simultaneously
3. Memory leak in listener implementation

**Solutions:**
- Reduce `maxConcurrentMessages` to limit parallel processing
- Reduce `maxMessagesPerPoll` to fetch fewer messages at once
- Profile your listener code for memory leaks

### Container not starting

**Check:**
1. Verify the container is registered as a provider
2. Check that dependencies are properly injected
3. Look for errors in application startup logs
4. Verify SQSClient is properly configured and injected

### Messages stuck in queue

**Possible causes:**
1. Listener is throwing errors and acknowledgement mode is `ON_SUCCESS`
2. Visibility timeout is too long
3. Dead letter queue is not configured

**Solutions:**
- Implement proper error handling in your listener
- Configure a dead letter queue on your SQS queue
- Use `ALWAYS` acknowledgement mode if messages should be removed regardless of processing outcome
- Check error handler logs to identify processing issues

### Type errors with message payload

**Solutions:**
- Ensure your message class matches the JSON structure
- Use `class-transformer` decorators for complex types
- Implement a custom `PayloadMessagingConverter` for non-JSON formats
- Enable validation to catch type mismatches early

### Validation errors for valid messages

**Possible causes:**
1. class-validator decorators don't match your data structure
2. Nested objects missing `@ValidateNested()` or `@Type()` decorators
3. String numbers not being transformed (e.g., "123" vs 123)
4. Date strings not being transformed to Date objects

**Solutions:**
- Review your validation decorators against actual message structure
- Add `@Type()` decorator for nested objects and arrays
- Use `@Transform()` decorator for custom transformations
- Enable `validationError.value: true` to see actual values in errors
- Check validation error details in logs or error handler

### class-validator not working

**Check:**
1. Verify class-validator is installed: `npm list class-validator`
2. Ensure validation is enabled: `enableValidation(true)`
3. Verify target class is set: `targetClass(YourEventClass)`
4. Check that your event class has validation decorators
5. Ensure decorators are imported from 'class-validator', not other packages

### Validation passing for invalid data

**Possible causes:**
1. Validation is disabled (default behavior)
2. No validation decorators on the class
3. Wrong decorators being used

**Solutions:**
- Explicitly enable validation: `enableValidation(true)`
- Add appropriate class-validator decorators to your event class
- Verify decorators are from 'class-validator' package
- Test validation in isolation with class-validator's `validate()` function

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
