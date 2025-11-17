# SQS Listener - Framework-Agnostic AWS SQS Message Consumer

[![Core Package](https://img.shields.io/npm/v/@snow-tzu/sqs-listener.svg?label=core)](https://www.npmjs.com/package/@snow-tzu/sqs-listener) [![NestJS Adapter](https://img.shields.io/npm/v/@snow-tzu/nest-sqs-listener.svg?label=nestjs)](https://www.npmjs.com/package/@snow-tzu/nest-sqs-listener) [![build](https://github.com/ganesanarun/sqs-listener/actions/workflows/build.yml/badge.svg)](https://github.com/ganesanarun/sqs-listener/actions/workflows/build.yml)

This monorepo contains two packages for consuming AWS SQS messages with type safety and validation:

- **[@snow-tzu/sqs-listener](./packages/core)** - Framework-agnostic core package that works with vanilla Node.js,
  Express, Fastify, Koa, or any Node.js environment
- **[@snow-tzu/nest-sqs-listener](./packages/nestjs-adapter)** - NestJS adapter that wraps the core with NestJS-specific
  features (dependency injection, lifecycle hooks, decorators)

Both packages share the same powerful features: type safety, automatic validation, flexible acknowledgement modes,
concurrency control, and extensibility. The core package provides the foundation, while framework adapters add
integration with specific frameworks.

**Choose your package:**

- 🎯 **Using NestJS?** → Install `@snow-tzu/nest-sqs-listener` (includes core automatically)
- 🚀 **Using Express, Fastify, or vanilla Node.js?** → Install `@snow-tzu/sqs-listener`

## Packages

### Core Package (@snow-tzu/sqs-listener)

The framework-agnostic foundation that handles all SQS message consumption logic.

**Features:**

- ✅ Type-safe message handling with generics
- ✅ Automatic message validation with class-validator
- ✅ Flexible acknowledgement modes (ON_SUCCESS, MANUAL, ALWAYS)
- ✅ Concurrency control with configurable limits
- ✅ Custom message converters and error handlers
- ✅ Works with any Node.js framework or vanilla Node.js

**Installation:**

```bash
npm install @snow-tzu/sqs-listener @aws-sdk/client-sqs
```

**Documentation:** [Core Package README](./packages/core/README.md)

---

### NestJS Adapter (@snow-tzu/nest-sqs-listener)

NestJS-specific wrapper that adds framework integration on top of the core package.

**Additional Features:**

- ✅ Full NestJS dependency injection support
- ✅ Automatic lifecycle management (OnModuleInit, OnModuleDestroy)
- ✅ NestJS Logger integration
- ✅ 100% backward compatible with v0.0.4
- ✅ Includes all core package features

**Installation:**

```bash
npm install @snow-tzu/nest-sqs-listener @aws-sdk/client-sqs
```

**Documentation:** [NestJS Adapter README](./packages/nestjs-adapter/README.md)

---

### Package Relationship

```
┌─────────────────────────────────────────┐
│   Your Application                      │
│   (NestJS, Express, Vanilla Node.js)    │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Framework Adapter (Optional)          │
│   @snow-tzu/nest-sqs-listener           │
│   - Lifecycle hooks                     │
│   - DI integration                      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   Core Package                          │
│   @snow-tzu/sqs-listener                │
│   - Message consumption                 │
│   - Validation                          │
│   - Error handling                      │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│   AWS SQS                               │
└─────────────────────────────────────────┘
```

## Quick Start

Get started quickly with complete, runnable examples for your framework.

### For NestJS Users

```typescript
// 1. Install
npm
install
@snow
-tzu / nest - sqs - listener
@aws
-sdk / client - sqs

// 2. Create your event class
import {IsString, IsNumber} from 'class-validator';

export class OrderCreatedEvent {
    @IsString()
    orderId: string;

    @IsNumber()
    amount: number;
}

// 3. Create your listener
import {Injectable} from '@nestjs/common';
import {QueueListener, MessageContext} from '@snow-tzu/nest-sqs-listener';

@Injectable()
export class OrderListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        console.log(`Processing order ${event.orderId} for $${event.amount}`);
        // Your business logic here
    }
}

// 4. Configure in your module
import {Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {NestJSSqsMessageListenerContainer} from '@snow-tzu/nest-sqs-listener';

@Module({
    providers: [
        OrderListener,
        {
            provide: 'SQS_CLIENT',
            useValue: new SQSClient({region: 'us-east-1'}),
        },
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (listener, sqsClient) => {
                const container = new NestJSSqsMessageListenerContainer(sqsClient);
                container.configure(options => {
                    options
                        .queueName('order-queue')
                        .targetClass(OrderCreatedEvent)
                        .enableValidation(true);
                });
                container.setMessageListener(listener);
                return container;
            },
            inject: [OrderListener, 'SQS_CLIENT'],
        },
    ],
})
export class OrderModule {
}
```

**That's it!** The container automatically starts on application initialization and stops on shutdown.

See the [NestJS basic example](./examples/basic) for a complete working application.

---

### For Vanilla Node.js Users

```typescript
// 1. Install

npm install @snow-tzu/sqs-listener @aws-sdk/client-sqs

// 2. Create your event class
import {IsString, IsNumber} from 'class-validator';

export class OrderCreatedEvent {
    @IsString()
    orderId: string;

    @IsNumber()
    amount: number;
}

// 3. Create your listener
import {QueueListener, MessageContext} from '@snow-tzu/sqs-listener';

class OrderListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        console.log(`Processing order ${event.orderId} for $${event.amount}`);
        // Your business logic here
    }
}

// 4. Set up the container
import {SQSClient} from '@aws-sdk/client-sqs';
import {SqsMessageListenerContainer} from '@snow-tzu/sqs-listener';

const sqsClient = new SQSClient({region: 'us-east-1'});
const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
    options
        .queueName('order-queue')
        .targetClass(OrderCreatedEvent)
        .enableValidation(true);
});

container.setMessageListener(new OrderListener());

// 5. Start listening
await container.start();
console.log('Listening for messages...');

// Graceful shutdown
process.on('SIGTERM', async () => {
    await container.stop();
    process.exit(0);
});
```

**Key difference:** You manually control the container lifecycle with `start()` and `stop()`.

See the [vanilla Node.js example](./examples/vanilla-nodejs) for a complete working application.

---

### For Express Users

```typescript
// 1. Install
npm install @snow-tzu/sqs-listener @aws-sdk/client-sqs express

// 2. Create your event class
import {IsString, IsNumber} from 'class-validator';

export class OrderCreatedEvent {
    @IsString()
    orderId: string;

    @IsNumber()
    amount: number;
}

// 3. Set up Express app with SQS listener
import express from 'express';
import {SQSClient} from '@aws-sdk/client-sqs';
import {SqsMessageListenerContainer, QueueListener, MessageContext} from '@snow-tzu/sqs-listener';

const app = express();
app.use(express.json());

// Your listener
class OrderListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        console.log(`Processing order ${event.orderId} for $${event.amount}`);
        // Your business logic here
    }
}

// Set up SQS container
const sqsClient = new SQSClient({region: 'us-east-1'});
const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
    options
        .queueName('order-queue')
        .targetClass(OrderCreatedEvent)
        .enableValidation(true);
});

container.setMessageListener(new OrderListener());

// Add Express routes
app.get('/health', (req, res) => {
    res.json({status: 'ok'});
});

// Start both Express and SQS listener
const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Express server running on port ${PORT}`);
    await container.start();
    console.log('SQS listener started');
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    await container.stop();
    process.exit(0);
});
```

**Perfect for:** Running SQS listeners alongside your REST API or web server.

See the [Express example](./examples/express) for a complete working application.

---

## Features

- 🚀 **Infrastructure abstraction** - Focus on business logic while the package handles all SQS infrastructure concerns
- 💉 **Full NestJS integration** - Leverage dependency injection and lifecycle hooks for seamless integration
- 🔒 **Type-safe** - Generic types throughout for compile-time safety and better developer experience
- 🎯 **Flexible acknowledgement** - Choose between ON_SUCCESS, MANUAL, or ALWAYS acknowledgement modes
- 🔄 **Concurrency control** - Configurable parallel message processing with semaphore-based limits
- 🛠️ **Highly customizable** - Bring your own message converters, error handlers
- ✅ **Testable** - All components are injectable and mockable for easy unit and integration testing

## Table of Contents

- [Packages](#packages)
- [Quick Start](#quick-start)
    - [For NestJS Users](#for-nestjs-users)
    - [For Vanilla Node.js Users](#for-vanilla-nodejs-users)
    - [For Express Users](#for-express-users)
- [Features](#features)
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

Choose the installation command based on your framework:

### For NestJS Users

Install the NestJS adapter package, which includes the core package automatically:

```bash
npm install @snow-tzu/nest-sqs-listener @aws-sdk/client-sqs
```

The `@snow-tzu/nest-sqs-listener` package includes `@snow-tzu/sqs-listener` as a dependency, so you don't need to
install the core package separately.

### For Non-NestJS Users (Express, Fastify, Vanilla Node.js)

Install the framework-agnostic core package:

```bash
npm install @snow-tzu/sqs-listener @aws-sdk/client-sqs
```

### Optional: Validation Support

For automatic message validation using decorators, install class-validator as a peer dependency:

```bash
npm install class-validator class-transformer
```

**Note:** class-transformer is already used internally for type conversion, but you may need to install it explicitly if
not already in your project. This applies to both packages.

## Why This Package?

Existing solutions for SQS message consumption (AWS SDK, bbc/sqs-consumer, @ssut/nestjs-sqs) often:

- Mix infrastructure logic with business code
- Require manual parsing and error handling
- Are tightly coupled to AWS SDK types (e.g., SQS Message)
- Lack of strong typing and validation
- Offer limited extensibility and testability
- Are framework-specific or require significant boilerplate for different frameworks

This package was created to solve these pain points by:

- **Framework-agnostic core** - Works with vanilla Node.js, Express, Fastify, Koa, or any Node.js environment
- **Clean architecture separation** - Core business logic is completely decoupled from framework concerns
- **Multiple framework support** - Use the same powerful features across NestJS, Express, or vanilla Node.js
- Abstracting all infrastructure concerns
- Providing a decorator-friendly, type-safe listener interface
- Supporting custom converters and error handlers
- Enabling centralized error handling and flexible acknowledgement modes
- Integrating seamlessly with NestJS DI and lifecycle hooks (via adapter)

Whether you're building a microservice with NestJS, adding background processing to your Express API, or creating a
standalone Node.js worker, this package provides a consistent, type-safe approach to SQS message consumption.

## Comparison

| Capability              | AWS SDK (raw) | bbc/sqs-consumer | @ssut/nestjs-sqs | @snow-tzu/sqs-listener (Core) | @snow-tzu/nest-sqs-listener (Adapter) |
|-------------------------|---------------|------------------|------------------|-------------------------------|---------------------------------------|
| Framework Support       | Any           | Any              | NestJS only      | Any (Node.js)                 | NestJS only                           |
| Listener Payload        | Raw JSON      | Raw JSON         | Raw SQS Message  | Strong Domain Event           | Strong Domain Event                   |
| Parsing                 | Manual        | Manual           | Manual           | Automatic via converter       | Automatic via converter               |
| Type Safety             | ❌ None        | ❌ None           | ⚠️ Weak          | ✅ Strong                      | ✅ Strong                              |
| NestJS DI Integration   | ❌ No          | ❌ No             | ✅ Partial        | N/A                           | ✅ Full                                |
| Architecture Separation | ❌ Poor        | ❌ Poor           | ⚠️ Partial       | ✅ Clean                       | ✅ Clean                               |
| Decorator-Friendly      | ❌ No          | ❌ No             | ❌ No             | ✅ Yes                         | ✅ Yes                                 |
| Ack Modes               | Manual only   | Auto only        | Auto only        | ON_SUCCESS / ALWAYS / MANUAL  | ON_SUCCESS / ALWAYS / MANUAL          |
| Centralized Errors      | ❌ No          | ⚠️ Limited       | ❌ No             | ✅ Yes                         | ✅ Yes                                 |
| Custom Converters       | ❌ No          | ❌ No             | ❌ No             | ✅ Yes                         | ✅ Yes                                 |
| Concurrency Control     | Manual        | ✅ Yes            | ✅ Yes            | ✅ Yes                         | ✅ Yes                                 |
| Testability             | Poor          | Hard             | Limited          | ✅ Excellent                   | ✅ Excellent                           |
| Extensibility           | Low           | Low              | Low              | High                          | High                                  |

## Core Concepts

> **Note:** The concepts below apply to both the core package (`@snow-tzu/sqs-listener`) and the NestJS adapter (
`@snow-tzu/nest-sqs-listener`). The core functionality is identical; the adapter adds NestJS-specific lifecycle
> management and dependency injection integration.

### Message Listener Container

The message listener container is the central component that manages the complete lifecycle of message consumption for a
single queue.

#### Core Package: `SqsMessageListenerContainer`

Available in `@snow-tzu/sqs-listener` for framework-agnostic usage:

```typescript
import {SqsMessageListenerContainer} from '@snow-tzu/sqs-listener';

const container = new SqsMessageListenerContainer(sqsClient);
// Manual lifecycle control
await container.start();
await container.stop();
```

**Features:**

- Polls an SQS queue using long polling
- Converts raw messages to typed payloads
- Validates messages (optional, using class-validator)
- Invokes your listener with the typed message
- Handles acknowledgement based on configured mode
- Manages concurrency limits
- Handles errors via error handlers

#### NestJS Adapter: `NestJSSqsMessageListenerContainer`

Available in `@snow-tzu/nest-sqs-listener` for NestJS integration:

```typescript
import {NestJSSqsMessageListenerContainer} from '@snow-tzu/nest-sqs-listener';

const container = new NestJSSqsMessageListenerContainer(sqsClient);
// Automatic lifecycle via NestJS hooks (OnModuleInit, OnModuleDestroy)
```

**Additional Features:**

- Extends `SqsMessageListenerContainer` with all core features
- Implements `OnModuleInit` - automatically starts when NestJS module initializes
- Implements `OnModuleDestroy` - automatically stops on graceful shutdown
- Integrates with NestJS Logger
- Works seamlessly with NestJS dependency injection

**Key Difference:** The NestJS adapter manages the container lifecycle automatically through NestJS lifecycle hooks,
while the core package requires manual `start()` and `stop()` calls.

---

### QueueListener Interface

The listener interface is identical in both packages:

```typescript
// Available in both packages
import {QueueListener, MessageContext} from '@snow-tzu/sqs-listener';
// OR
import {QueueListener, MessageContext} from '@snow-tzu/nest-sqs-listener';

interface QueueListener<T> {
    onMessage(payload: T, context: MessageContext): Promise<void>;
}
```

Your listener receives:

- `payload: T` - The strongly-typed, validated message payload
- `context: MessageContext` - Metadata and control methods for the message

**Implementation:**

```typescript
// Vanilla Node.js / Express
class OrderListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        // Your business logic
    }
}

// NestJS with dependency injection
@Injectable()
class OrderListener implements QueueListener<OrderCreatedEvent> {
    constructor(private orderService: OrderService) {
    }

    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        await this.orderService.processOrder(event);
    }
}
```

---

### MessageContext

Provides access to message metadata and control methods:

```typescript
interface MessageContext {
    getMessageId(): string;

    getReceiptHandle(): string;

    getQueueUrl(): string;

    getMessageAttributes(): SQSMessageAttributes;

    getSystemAttributes(): Record<string, string>;

    getApproximateReceiveCount(): number;

    acknowledge(): Promise<void>; // For MANUAL acknowledgement mode
}
```

**Usage Example:**

```typescript
async
onMessage(event
:
OrderCreatedEvent, context
:
MessageContext
):
Promise < void > {
    console.log(`Processing message ${context.getMessageId()}`);

    // Check retry count
    if(context.getApproximateReceiveCount() > 3
)
{
    console.warn('Message has been retried multiple times');
}

// Manual acknowledgement (when using AcknowledgementMode.MANUAL)
await this.processOrder(event);
await context.acknowledge();
}
```

---

### Package Import Summary

**Core Package** (`@snow-tzu/sqs-listener`):

```typescript
import {
    SqsMessageListenerContainer,
    QueueListener,
    MessageContext,
    AcknowledgementMode,
    ValidationFailureMode,
    PayloadMessagingConverter,
    QueueListenerErrorHandler,
    LoggerInterface
} from '@snow-tzu/sqs-listener';
```

**NestJS Adapter** (`@snow-tzu/nest-sqs-listener`):

```typescript
import {
    NestJSSqsMessageListenerContainer,  // NestJS-specific container
    QueueListener,                       // Re-exported from core
    MessageContext,                      // Re-exported from core
    AcknowledgementMode,                 // Re-exported from core
    ValidationFailureMode,               // Re-exported from core
    PayloadMessagingConverter,           // Re-exported from core
    QueueListenerErrorHandler,           // Re-exported from core
    // Note: Use NestJS Logger instead of LoggerInterface
} from '@snow-tzu/nest-sqs-listener';
```

The adapter re-exports all core types, so you only need to import from one package.

## Validation

> **Note:** Validation is a core feature available in both packages. Whether you're using `@snow-tzu/sqs-listener` (
> core) or `@snow-tzu/nest-sqs-listener` (adapter), the validation functionality works identically. All examples below
> apply to both packages.

This package integrates seamlessly with [class-validator](https://github.com/typestack/class-validator) to automatically
validate incoming SQS messages against your business rules. When enabled, messages are validated before reaching your
listener, ensuring your business logic only processes valid data.

### Why Validation?

- **Data Integrity**: Ensure messages meet your business rules before processing
- **Early Error Detection**: Catch invalid messages before they cause runtime errors
- **Clear Error Messages**: Get detailed validation failures for debugging
- **Flexible Error Handling**: Choose how to handle invalid messages (throw, acknowledge, or reject)
- **Type Safety**: Leverage TypeScript decorators for compile-time and runtime validation

### Basic Validation Example

#### 1. Define your event class with validation decorators

```typescript
import {IsString, IsNumber, IsPositive, IsEmail, Min, Max} from 'class-validator';

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
// Import from either package - validation works the same way
import {ValidationFailureMode} from '@snow-tzu/sqs-listener';
// OR
import {ValidationFailureMode} from '@snow-tzu/nest-sqs-listener';

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
// NestJS example with dependency injection
@Injectable()
export class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
    constructor(private orderService: OrderService) {
    }

    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        // message is guaranteed to be valid - no need for manual validation!
        await this.orderService.processOrder(message);
    }
}

// Vanilla Node.js / Express example
class OrderCreatedListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(message: OrderCreatedEvent, context: MessageContext): Promise<void> {
        // message is guaranteed to be valid - no need for manual validation!
        console.log(`Processing order ${message.orderId}`);
    }
}
```

### Validation Failure Modes

Control what happens when a message fails validation:

#### THROW (Default)

Throws an error and invokes your error handler. The message remains in the queue for retry.

```typescript
.
validationFailureMode(ValidationFailureMode.THROW)
```

**Use when:**

- You want to handle validation errors in your error handler
- Invalid messages might become valid after a system fix
- You want validation errors to follow your standard error handling flow

#### ACKNOWLEDGE

Logs the validation error and immediately removes the message from the queue. Your listener is never invoked.

```typescript
.
validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
```

**Use when:**

- Invalid messages will never become valid (bad data from source)
- You want to discard invalid messages to prevent queue blocking
- You're monitoring logs for validation failures

#### REJECT

Logs the validation error but doesn't acknowledge the message. The message will retry and eventually move to your
dead-letter queue.

```typescript
.
validationFailureMode(ValidationFailureMode.REJECT)
```

**Use when:**

- You want invalid messages to go to a dead-letter queue for analysis
- You don't want to invoke error handler overhead for validation failures
- You're using a separate process to handle DLQ messages

### Validation Options

Pass any [class-validator ValidatorOptions](https://github.com/typestack/class-validator#passing-options) to customize
validation behavior:

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
import {IsString, IsNumber, IsPositive, ValidateNested, IsArray} from 'class-validator';
import {Type} from 'class-transformer';

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
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items: OrderItem[];

    @IsNumber()
    @IsPositive()
    totalAmount: number;
}
```

### Validation with Custom Converters

If you're using a custom message converter (XML, Protobuf, etc.), you can still add validation using the
`ValidatingPayloadConverter` decorator:

```typescript
// Import from either package - works the same way
import {
    ValidatingPayloadConverter,
    ValidationFailureMode,
    PayloadMessagingConverter
} from '@snow-tzu/sqs-listener';
// OR
import {
    ValidatingPayloadConverter,
    ValidationFailureMode,
    PayloadMessagingConverter
} from '@snow-tzu/nest-sqs-listener';

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
        validatorOptions: {whitelist: true}
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

> **Note:** Configuration options are identical in both the core package (`@snow-tzu/sqs-listener`) and the NestJS
> adapter (`@snow-tzu/nest-sqs-listener`). The key difference is in lifecycle management: NestJS automatically manages
> container startup/shutdown, while the core package requires manual control.

### Container Configuration

The configuration API is the same for both packages:

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
        .validatorOptions({whitelist: true});
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

### Configuration Examples by Framework

#### NestJS Configuration

With the NestJS adapter, the container automatically starts when the module initializes and stops on shutdown:

```typescript
import {Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    NestJSSqsMessageListenerContainer,
    AcknowledgementMode
} from '@snow-tzu/nest-sqs-listener';

@Module({
    providers: [
        OrderListener,
        {
            provide: 'SQS_CLIENT',
            useValue: new SQSClient({region: 'us-east-1'}),
        },
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (listener, sqsClient) => {
                const container = new NestJSSqsMessageListenerContainer(sqsClient);

                container.configure(options => {
                    options
                        .queueName('order-queue')
                        .targetClass(OrderCreatedEvent)
                        .enableValidation(true)
                        .pollTimeout(20)
                        .maxConcurrentMessages(5)
                        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
                });

                container.setMessageListener(listener);
                return container;
            },
            inject: [OrderListener, 'SQS_CLIENT'],
        },
    ],
})
export class OrderModule {
}
```

**Lifecycle Management:**

- ✅ Container starts automatically via `OnModuleInit` hook
- ✅ Container stops automatically via `OnModuleDestroy` hook
- ✅ No manual `start()` or `stop()` calls needed
- ✅ Integrates with NestJS graceful shutdown

---

#### Vanilla Node.js Configuration

With the core package, you manually control the container lifecycle:

```typescript
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    SqsMessageListenerContainer,
    AcknowledgementMode
} from '@snow-tzu/sqs-listener';

// Create and configure container
const sqsClient = new SQSClient({region: 'us-east-1'});
const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
    options
        .queueName('order-queue')
        .targetClass(OrderCreatedEvent)
        .enableValidation(true)
        .pollTimeout(20)
        .maxConcurrentMessages(5)
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
});

container.setMessageListener(new OrderListener());

// Manually start the container
await container.start();
console.log('Container started, listening for messages...');

// Graceful shutdown handling
process.on('SIGTERM', async () => {
    console.log('Shutting down gracefully...');
    await container.stop();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('Shutting down gracefully...');
    await container.stop();
    process.exit(0);
});
```

**Lifecycle Management:**

- ⚠️ You must call `container.start()` to begin listening
- ⚠️ You must call `container.stop()` for graceful shutdown
- ⚠️ You must handle process signals (SIGTERM, SIGINT) manually
- ✅ Full control over when the container runs

---

#### Express Configuration

With Express, you typically start the container alongside your HTTP server:

```typescript
import express from 'express';
import {SQSClient} from '@aws-sdk/client-sqs';
import {
    SqsMessageListenerContainer,
    AcknowledgementMode
} from '@snow-tzu/sqs-listener';

const app = express();

// Configure SQS container
const sqsClient = new SQSClient({region: 'us-east-1'});
const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
    options
        .queueName('order-queue')
        .targetClass(OrderCreatedEvent)
        .enableValidation(true)
        .pollTimeout(20)
        .maxConcurrentMessages(5)
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
});

container.setMessageListener(new OrderListener());

// Start both Express and SQS listener
const PORT = 3000;
app.listen(PORT, async () => {
    console.log(`Express server running on port ${PORT}`);
    await container.start();
    console.log('SQS listener started');
});

// Graceful shutdown for both services
const shutdown = async () => {
    console.log('Shutting down gracefully...');
    await container.stop();
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
```

**Lifecycle Management:**

- ⚠️ Start container after Express server is ready
- ⚠️ Stop container before process exits
- ✅ Run SQS listener alongside HTTP server
- ✅ Share dependencies between HTTP and SQS handlers

---

### Lifecycle Management Summary

| Aspect              | NestJS Adapter                  | Core Package                            |
|---------------------|---------------------------------|-----------------------------------------|
| **Startup**         | Automatic via `OnModuleInit`    | Manual via `container.start()`          |
| **Shutdown**        | Automatic via `OnModuleDestroy` | Manual via `container.stop()`           |
| **Signal Handling** | Built into NestJS               | You must implement                      |
| **Control**         | Framework-managed               | Full manual control                     |
| **Use Case**        | NestJS applications             | Vanilla Node.js, Express, Fastify, etc. |

### Acknowledgement Modes

Acknowledgement modes control when messages are deleted from the queue. This behavior is identical in both packages.

#### ON_SUCCESS (Default)

Deletes message only if `onMessage()` completes successfully:

```typescript
container.configure(options => {
    options
        .queueName('order-queue')
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
});
```

**Behavior:**

- ✅ Message deleted if `onMessage()` completes without error
- ❌ Message remains in queue if error is thrown
- ✅ Message becomes visible again after visibility timeout
- ✅ Automatic retry on failure

**Use when:**

- You want automatic retry on failure
- Processing is idempotent
- You have a dead-letter queue configured for poison messages

---

#### MANUAL

Never automatically deletes messages - you control acknowledgement:

```typescript
container.configure(options => {
    options
        .queueName('order-queue')
        .acknowledgementMode(AcknowledgementMode.MANUAL);
});

// In your listener
class OrderListener implements QueueListener<OrderCreatedEvent> {
    async onMessage(event: OrderCreatedEvent, context: MessageContext): Promise<void> {
        try {
            // Process the order
            await this.processOrder(event);

            // Explicitly acknowledge only on success
            await context.acknowledge();
        } catch (error) {
            // Don't acknowledge - message will retry
            console.error('Processing failed, message will retry', error);
            throw error;
        }
    }
}
```

**Behavior:**

- ⚠️ Message is NEVER deleted automatically
- ✅ You call `context.acknowledge()` to delete
- ✅ Full control over when to acknowledge
- ✅ Can acknowledge at any point in your workflow

**Use when:**

- You need transactional processing (e.g., database commit + acknowledge)
- You want to acknowledge before processing completes
- You have complex conditional acknowledgement logic
- You're implementing saga patterns or distributed transactions

---

#### ALWAYS

Always deletes message, even if processing fails:

```typescript
container.configure(options => {
    options
        .queueName('order-queue')
        .acknowledgementMode(AcknowledgementMode.ALWAYS);
});
```

**Behavior:**

- ✅ Message deleted even if `onMessage()` throws error
- ⚠️ Failed messages are lost (not retried)
- ✅ Queue never gets blocked by poison messages
- ⚠️ You must handle failures externally

**Use when:**

- Messages are non-critical (e.g., analytics events)
- You have external error tracking/logging
- You're using an external dead-letter mechanism
- You want to prevent queue blocking at all costs

---

### Acknowledgement Mode Comparison

| Mode           | Auto Delete on Success | Auto Delete on Failure | Retry on Failure | Use Case                               |
|----------------|------------------------|------------------------|------------------|----------------------------------------|
| **ON_SUCCESS** | ✅ Yes                  | ❌ No                   | ✅ Yes            | Most use cases, idempotent processing  |
| **MANUAL**     | ❌ No                   | ❌ No                   | ⚠️ Your choice   | Transactional workflows, complex logic |
| **ALWAYS**     | ✅ Yes                  | ✅ Yes                  | ❌ No             | Non-critical messages, external DLQ    |

## Extensibility & Decorators

> **Note:** The decorator pattern is a core feature that works identically in both packages. Whether you're using
`@snow-tzu/sqs-listener` (core) or `@snow-tzu/nest-sqs-listener` (adapter), you can implement decorators the same way.
> The examples below are framework-agnostic and work with vanilla Node.js, Express, or NestJS.

This package focuses on SQS message consumption and does not include built-in tracing or observability features.
Instead, you can implement your own decorators to add cross-cutting concerns like tracing, metrics, or logging.

### Why Use Decorators?

Decorators allow you to:

- Keep business logic clean and focused
- Use any observability tool (OpenTelemetry, New Relic, Datadog, etc.)
- Compose multiple decorators together
- Test business logic without tracing overhead
- Add or remove concerns without modifying core code
- Work consistently across any Node.js framework

### Example: Tracing Decorator (Framework-Agnostic)

This decorator works with both packages and any framework:

```typescript
// Import from either package - works the same way
import {QueueListener, MessageContext} from '@snow-tzu/sqs-listener';
// OR
import {QueueListener, MessageContext} from '@snow-tzu/nest-sqs-listener';

import {trace, context as otContext, SpanStatusCode} from '@opentelemetry/api';

export class TracingListener<T> implements QueueListener<T> {
    constructor(private readonly listener: QueueListener<T>) {
    }

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
            span.setStatus({code: SpanStatusCode.OK});
        } catch (error) {
            span.recordException(error as Error);
            span.setStatus({code: SpanStatusCode.ERROR});
            throw error;
        } finally {
            span.end();
        }
    }
}
```

### Usage Across Frameworks

The decorator pattern works identically across all frameworks:

#### Vanilla Node.js / Express

```typescript
import {SqsMessageListenerContainer} from '@snow-tzu/sqs-listener';

// Create business logic listener
const businessListener = new OrderCreatedListener();

// Wrap with tracing decorator
const tracingListener = new TracingListener(businessListener);

// Register decorated listener with container
const container = new SqsMessageListenerContainer(sqsClient);
container.setMessageListener(tracingListener);
await container.start();
```

#### NestJS with Dependency Injection

```typescript
import {NestJSSqsMessageListenerContainer} from '@snow-tzu/nest-sqs-listener';

@Module({
    providers: [
        OrderCreatedListener,
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (listener: OrderCreatedListener, sqsClient: SQSClient) => {
                // Wrap with decorator
                const tracingListener = new TracingListener(listener);

                const container = new NestJSSqsMessageListenerContainer(sqsClient);
                container.configure(options => options.queueName('order-queue'));
                container.setMessageListener(tracingListener);
                return container;
            },
            inject: [OrderCreatedListener, 'SQS_CLIENT'],
        },
    ],
})
export class OrderModule {
}
```

### Composing Multiple Decorators

You can chain multiple decorators together in any framework:

```typescript
// Framework-agnostic logging decorator
export class LoggingListener<T> implements QueueListener<T> {
    constructor(
        private readonly listener: QueueListener<T>,
        private readonly logger: { log: (msg: string) => void; error: (msg: string, err?: any) => void }
    ) {
    }

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

// Framework-agnostic metrics decorator
export class MetricsListener<T> implements QueueListener<T> {
    constructor(
        private readonly listener: QueueListener<T>,
        private readonly metrics: {
            increment: (name: string) => void;
            timing: (name: string, value: number) => void;
        }
    ) {
    }

    async onMessage(payload: T, context: MessageContext): Promise<void> {
        this.metrics.increment('messages.received');
        const start = Date.now();

        try {
            await this.listener.onMessage(payload, context);
            this.metrics.timing('messages.duration', Date.now() - start);
            this.metrics.increment('messages.success');
        } catch (error) {
            this.metrics.increment('messages.error');
            throw error;
        }
    }
}

// Compose decorators - works the same in any framework
const businessListener = new OrderCreatedListener();
const withLogging = new LoggingListener(businessListener, logger);
const withMetrics = new MetricsListener(withLogging, metricsService);
const withTracing = new TracingListener(withMetrics);

container.setMessageListener(withTracing);
```

### Framework-Specific Integration Notes

While the decorator pattern is framework-agnostic, you may want to leverage framework-specific features:

#### NestJS-Specific Patterns

When using NestJS, you can take advantage of dependency injection for decorators:

```typescript
// Make decorators injectable for better DI integration
@Injectable()
export class TracingListenerFactory {
    create<T>(listener: QueueListener<T>): QueueListener<T> {
        return new TracingListener(listener);
    }
}

// Use in module
@Module({
    providers: [
        OrderCreatedListener,
        TracingListenerFactory,
        {
            provide: 'ORDER_CONTAINER',
            useFactory: (
                listener: OrderCreatedListener,
                tracingFactory: TracingListenerFactory,
                sqsClient: SQSClient
            ) => {
                const decoratedListener = tracingFactory.create(listener);
                const container = new NestJSSqsMessageListenerContainer(sqsClient);
                container.setMessageListener(decoratedListener);
                return container;
            },
            inject: [OrderCreatedListener, TracingListenerFactory, 'SQS_CLIENT'],
        },
    ],
})
export class OrderModule {
}
```

#### Express/Vanilla Node.js Patterns

For non-NestJS frameworks, you can use factory functions or simple composition:

```typescript
// Factory function for creating decorated listeners
function createDecoratedListener<T>(
    businessListener: QueueListener<T>,
    logger: any,
    metrics: any
): QueueListener<T> {
    const withLogging = new LoggingListener(businessListener, logger);
    const withMetrics = new MetricsListener(withLogging, metrics);
    const withTracing = new TracingListener(withMetrics);
    return withTracing;
}

// Usage
const listener = createDecoratedListener(
    new OrderCreatedListener(),
    console,
    metricsClient
);

container.setMessageListener(listener);
```

See the [advanced example](./examples/advanced) for a complete NestJS implementation with OpenTelemetry, and
the [vanilla Node.js example](./examples/vanilla-nodejs) for framework-agnostic patterns.

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
            useFactory: () => new SQSClient({region: 'us-east-1'}),
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
export class OrderModule {
}
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
import {Injectable, Logger} from '@nestjs/common';
import {QueueListenerErrorHandler, MessageContext} from 'nest-sqs-listener';

@Injectable()
export class OrderErrorHandler implements QueueListenerErrorHandler {
    constructor(private readonly logger: Logger) {
    }

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
import {Injectable} from '@nestjs/common';
import {PayloadMessagingConverter} from 'nest-sqs-listener';

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
            useFactory: () => new SQSClient({region: 'us-east-1'}),
        },
        // EU West SQS Client
        {
            provide: 'EU_WEST_SQS_CLIENT',
            useFactory: () => new SQSClient({region: 'eu-west-1'}),
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
export class OrderModule {
}
```

## Examples

The repository includes complete, runnable examples for different frameworks and use cases. All examples work with
LocalStack for local testing without AWS credentials.

### NestJS Examples

These examples use the **NestJS adapter** (`@snow-tzu/nest-sqs-listener`) with full dependency injection and lifecycle
management.

#### [Basic Example](./examples/basic) ⭐

**Package:** `@snow-tzu/nest-sqs-listener` (NestJS Adapter)

Minimal NestJS setup demonstrating core functionality with a single queue listener.

**What you'll learn:**

- Single queue listener configuration with NestJS DI
- Automatic acknowledgement (ON_SUCCESS mode)
- Automatic lifecycle management (OnModuleInit/OnModuleDestroy)
- Message validation with class-validator
- Business logic separation with injectable services
- LocalStack setup for local testing

**Perfect for:** First-time NestJS users, simple use cases, learning the basics

**Key files:**

- `order-created.listener.ts` - Injectable listener with DI
- `order-created.event.ts` - Event class with validation decorators
- `order.module.ts` - NestJS module with container configuration
- `order.service.ts` - Business logic with dependency injection

---

#### [Advanced Example](./examples/advanced) ⭐⭐⭐

**Package:** `@snow-tzu/nest-sqs-listener` (NestJS Adapter)

Production-ready NestJS patterns with advanced features and multiple queue listeners.

**What you'll learn:**

- **Listener decorator pattern** for adding tracing, logging, and metrics
- **OpenTelemetry distributed tracing** implementation
- **Custom error handling** with retry logic and validation error detection
- **Manual acknowledgement** for fine-grained control
- **Multiple queue listeners** with different configurations
- **Multiple AWS account connections** using separate SQS clients
- **Symbol-based dependency injection** for type safety
- **Advanced validation patterns** with different failure modes (THROW, ACKNOWLEDGE)

**Perfect for:** Production NestJS applications, complex workflows, advanced patterns

**Key files:**

- `tracing.listener.ts` - Decorator pattern for cross-cutting concerns
- `custom-error.handler.ts` - Custom error handling with validation support
- `order-created.event.ts` - Event with strict UUID validation
- `notification.event.ts` - Event with ACKNOWLEDGE validation mode
- `notification.listener.ts` - Manual acknowledgement example
- `tokens.ts` - Symbol-based DI tokens

---

### Framework-Agnostic Examples

These examples use the **core package** (`@snow-tzu/sqs-listener`) directly, demonstrating usage without framework
dependencies.

#### [Vanilla Node.js Example](./examples/vanilla-nodejs) ⭐

**Package:** `@snow-tzu/sqs-listener` (Core Package)

Pure Node.js implementation with no framework dependencies, showing manual lifecycle management.

**What you'll learn:**

- Using the core package without any framework
- Manual container lifecycle control (`start()` and `stop()`)
- Custom logger implementation (LoggerInterface)
- Graceful shutdown handling with process signals
- Type-safe message handling without DI
- Minimal dependencies and maximum portability

**Perfect for:** Framework-agnostic applications, standalone workers, learning core concepts

**Key files:**

- `index.ts` - Manual container setup and lifecycle management
- `order-listener.ts` - Plain class implementing QueueListener
- `custom-logger.ts` - Custom logger implementation
- `order-created.event.ts` - Event class with validation

---

#### [Express Example](./examples/express) ⭐⭐

**Package:** `@snow-tzu/sqs-listener` (Core Package)

Integration with Express web framework, running SQS listener alongside HTTP server.

**What you'll learn:**

- Using the core package with Express.js
- Running SQS listener alongside a web server
- Coordinating multiple service lifecycles
- Graceful shutdown for both HTTP and SQS
- Sharing business logic between HTTP and SQS handlers
- Manual container lifecycle management

**Perfect for:** Express applications, REST APIs with background processing, hybrid services

**Key files:**

- `app.ts` - Express app setup with SQS integration
- `index.ts` - Coordinated startup of HTTP and SQS services
- `order-listener.ts` - Listener implementation
- `sqs-manager.ts` - SQS container lifecycle management

---

### Validation Examples

#### [Validation Guide](./examples/VALIDATION_EXAMPLES.md) 📋

**Applies to:** Both packages (core and adapter)

Comprehensive guide to message validation patterns with class-validator.

**What you'll learn:**

- Basic validation setup with decorators
- Three validation failure modes (THROW, ACKNOWLEDGE, REJECT)
- Nested object and array validation
- Custom validators and conditional validation
- Handling validation errors in error handlers
- Testing validation with invalid messages
- Best practices for production use

**Perfect for:** Understanding validation features, implementing data integrity checks

---

### Running Examples Locally

All examples include LocalStack setup for testing without AWS credentials:

#### 1. Start LocalStack and Create Queues

```bash
# From the examples directory
cd examples

# Start LocalStack
docker-compose up -d

# Create SQS queues
./scripts/setup-queues.sh
```

#### 2. Run an Example

Choose an example based on your framework:

**For NestJS examples (basic or advanced):**

```bash
cd basic  # or: cd advanced
npm install
cp .env.example .env
npm run start:dev
```

**For vanilla Node.js example:**

```bash
cd vanilla-nodejs
npm install
cp .env.example .env
npm start
```

**For Express example:**

```bash
cd express
npm install
cp .env.example .env
npm start
```

#### 3. Send Test Messages

In another terminal, from the examples' directory:

```bash
./scripts/send-test-messages.sh localstack
```

You should see messages being processed in the application logs.

#### 4. Send Invalid Messages (for validation testing)

```bash
./scripts/send-invalid-messages.sh
```

This sends messages with validation errors to test different validation failure modes.

---

### Example Comparison

| Example                                      | Framework  | Package |  Lifecycle | DI  | Best For                    |
|----------------------------------------------|------------|---------|-----------|-----|-----------------------------|
| [Vanilla Node.js](./examples/vanilla-nodejs) | None       | Core    |  Manual    | No  | Framework-agnostic usage    |
| [Express](./examples/express)                | Express.js | Core    |  Manual    | No  | Express applications        |
| [Basic](./examples/basic)                    | NestJS     | Adapter |  Automatic | Yes | Getting started with NestJS |
| [Advanced](./examples/advanced)              | NestJS     | Adapter |  Automatic | Yes | Production NestJS patterns  |

---

See the [examples README](./examples/README.md) for detailed instructions, troubleshooting, and additional commands.

## Testing

### Unit Testing Listeners

```typescript
import {Test} from '@nestjs/testing';
import {OrderCreatedListener} from './order-created.listener';
import {OrderService} from './order.service';
import {MessageContext} from 'nest-sqs-listener';

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
        const payload = {orderId: '123', customerId: '456', amount: 100};

        await listener.onMessage(payload, context);

        expect(orderService.processNewOrder).toHaveBeenCalledWith(payload);
    });
});
```

### Integration Testing with Mock SQSClient

```typescript
import {Test} from '@nestjs/testing';
import {SqsMessageListenerContainer} from 'nest-sqs-listener';
import {SQSClient, ReceiveMessageCommand} from '@aws-sdk/client-sqs';
import {mockClient} from 'aws-sdk-client-mock';

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
                Body: JSON.stringify({orderId: '456', customerId: '789', amount: 100}),
            }]
        });

        await container.start();
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait for processing

        expect(listener.onMessage).toHaveBeenCalledWith(
            {orderId: '456', customerId: '789', amount: 100},
            expect.any(Object)
        );

        await container.stop();
    });
});
```

### E2E Testing with LocalStack

```typescript
import {Test} from '@nestjs/testing';
import {INestApplication} from '@nestjs/common';
import {SQSClient, CreateQueueCommand, SendMessageCommand} from '@aws-sdk/client-sqs';
import {AppModule} from './app.module';

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
            MessageBody: JSON.stringify({orderId: '789', customerId: '123', amount: 50}),
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
    logger?: Logger)
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
constructor(innerConverter: PayloadMessagingConverter<T>, targetClass: Type<T>,
    options ? : JsonPayloadConverterOptions,
    logger ? : Logger
)
```

**Usage:**

```typescript
const xmlConverter = new XmlPayloadConverter();
const validatingConverter = new ValidatingPayloadConverter(
    xmlConverter,
    OrderCreatedEvent,
    {enableValidation: true}
);
```

#### MessageValidationError

Error is thrown when message validation fails (in THROW mode).

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
2. Ensure the queue name or URL is correct
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
- Verify the target class is set: targetClass(YourEventClass)
- Add appropriate class-validator decorators to your event class
- Verify decorators are from 'class-validator' package
- Test validation in isolation with class-validator's `validate()` function

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT
