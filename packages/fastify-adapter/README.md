# @snow-tzu/fastify-sqs-listener

Fastify plugin for integrating SQS message consumption with native Fastify patterns. This adapter wraps the framework-agnostic `@snow-tzu/sqs-listener` core package to provide seamless integration with Fastify's plugin system, lifecycle hooks, and logging.

## Features

- 🔌 **Native Fastify Plugin** - Integrates seamlessly with Fastify's plugin system
- 🚀 **Automatic Lifecycle Management** - Starts/stops with Fastify server lifecycle
- 📝 **Fastify Logger Integration** - Uses Fastify's built-in pino logger
- 🔒 **Type-Safe** - Full TypeScript support with Fastify type augmentation
- 🎯 **Composable Patterns** - Support for QueueListener interface and decorators
- ⚡ **Framework-Agnostic Core** - Same message processing logic across all frameworks

## Installation

```bash
npm install @snow-tzu/fastify-sqs-listener @snow-tzu/sqs-listener
# or
yarn add @snow-tzu/fastify-sqs-listener @snow-tzu/sqs-listener
```

For message validation support, also install class-validator:

```bash
npm install class-validator
# or
yarn add class-validator
```

## Quick Start

Here's a complete example showing Fastify-specific usage with plugin registration:

```typescript
import Fastify from 'fastify';
import { SQSClient } from '@aws-sdk/client-sqs';
import { sqsListenerPlugin, ValidationFailureMode, ValidatorOptions } from '@snow-tzu/fastify-sqs-listener';
import { QueueListener, TraceQueueListener } from '@snow-tzu/sqs-listener';
import { IsString, IsNumber, Min } from 'class-validator';

// Define your message type with validation
class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

// Implement your message listener
class OrderListener implements QueueListener<OrderCreatedEvent> {
  constructor(private logger: any) {}

  async handle(message: OrderCreatedEvent): Promise<void> {
    this.logger.info('Processing order', { 
      orderId: message.orderId,
      customerId: message.customerId,
      amount: message.amount 
    });
    
    // Your business logic here
    await this.processOrder(message);
    
    this.logger.info('Order processed successfully', { orderId: message.orderId });
  }

  private async processOrder(order: OrderCreatedEvent): Promise<void> {
    // Simulate order processing
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Create Fastify instance with logging
const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty'
    }
  }
});

// Create SQS client
const sqsClient = new SQSClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:4566' // LocalStack for local development
});

// Use composable decorator pattern
const orderListener = new TraceQueueListener(
  new OrderListener(fastify.log)
);

// Register the SQS listener plugin
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener:
    {
      messageType: OrderCreatedEvent,
      listener: orderListener
    },
  sqsClient,
  autoStartup: true, // Start automatically when Fastify is ready
  maxConcurrentMessages: 5
});

// Start the server - SQS listener starts automatically
await fastify.listen({ port: 3000, host: '0.0.0.0' });
```

## Plugin Options

The plugin accepts the following configuration options:

```typescript
interface FastifySqsListenerOptions {
  queueNameOrUrl: string;                    // Required: SQS queue URL
  listener: {                   // Required: Message listeners
    messageType: Type<any>;
    listener: QueueListener<any>;
  };
  sqsClient: SQSClient;               // Required: AWS SQS client
  autoStartup?: boolean;              // Optional: Auto-start with Fastify (default: true)
  maxConcurrentMessages?: number;     // Optional: Max concurrent processing (default: 1)
  acknowledgementMode?: AcknowledgementMode; // Optional: When to acknowledge messages
  logger?: LoggerInterface;           // Optional: Custom logger (uses Fastify logger by default)
  
  // Validation Options
  enableValidation?: boolean;         // Optional: Enable class-validator validation
  validationFailureMode?: ValidationFailureMode; // Optional: How to handle validation failures
  validatorOptions?: ValidatorOptions; // Optional: class-validator options
}
```

## Message Validation

The plugin supports automatic message validation using class-validator decorators. This ensures that incoming SQS messages conform to your expected data structure before being processed by your listeners.

### Basic Validation Setup

First, install class-validator if you haven't already:

```bash
npm install class-validator class-transformer
```

Define your message class with validation decorators:

```typescript
import { IsString, IsNumber, IsEmail, Min, Max, IsOptional } from 'class-validator';

class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsEmail()
  customerEmail: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
```

Enable validation in your plugin configuration:

```typescript
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true // Enable automatic validation
});
```

### Validation Failure Modes

You can control how validation failures are handled using the `validationFailureMode` option:

#### THROW Mode (Default)
Throws an error and invokes the error handler. The message remains in the queue for retry:

```typescript
import { ValidationFailureMode } from '@snow-tzu/fastify-sqs-listener';

await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validationFailureMode: ValidationFailureMode.THROW // Default behavior
});
```

#### ACKNOWLEDGE Mode
Logs the validation error and removes the message from the queue (prevents retry):

```typescript
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validationFailureMode: ValidationFailureMode.ACKNOWLEDGE // Remove invalid messages
});
```

#### REJECT Mode
Logs the validation error and allows the message to be retried:

```typescript
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validationFailureMode: ValidationFailureMode.REJECT // Allow retry
});
```

### Advanced Validator Options

You can customize class-validator behavior using the `validatorOptions` parameter:

#### Whitelist Mode
Strip properties not defined in your class:

```typescript
import { ValidatorOptions } from '@snow-tzu/fastify-sqs-listener';

await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validatorOptions: {
    whitelist: true, // Remove unknown properties
    forbidNonWhitelisted: true // Throw error for unknown properties
  }
});
```

#### Validation Groups
Validate only specific groups of properties:

```typescript
class OrderCreatedEvent {
  @IsString({ groups: ['create', 'update'] })
  orderId: string;

  @IsString({ groups: ['create'] })
  customerId: string;

  @IsNumber({ groups: ['update'] })
  @Min(0, { groups: ['update'] })
  amount: number;
}

// Validate only 'create' group properties
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validatorOptions: {
    groups: ['create'] // Only validate properties in 'create' group
  }
});
```

#### Skip Missing Properties
Skip validation for undefined properties:

```typescript
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'order-events',
  listener: {
    messageType: OrderCreatedEvent,
    listener: new OrderListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validatorOptions: {
    skipMissingProperties: true // Don't validate undefined properties
  }
});
```

### Complete Validation Example

Here's a comprehensive example showing validation in action:

```typescript
import Fastify from 'fastify';
import { SQSClient } from '@aws-sdk/client-sqs';
import { sqsListenerPlugin, ValidationFailureMode, ValidatorOptions } from '@snow-tzu/fastify-sqs-listener';
import { QueueListener } from '@snow-tzu/sqs-listener';
import { IsString, IsNumber, IsEmail, IsOptional, Min, Max, IsIn } from 'class-validator';

// Define message with comprehensive validation
class UserRegistrationEvent {
  @IsString()
  userId: string;

  @IsEmail()
  email: string;

  @IsString()
  @Min(2)
  @Max(50)
  firstName: string;

  @IsString()
  @Min(2)
  @Max(50)
  lastName: string;

  @IsNumber()
  @Min(13)
  @Max(120)
  age: number;

  @IsOptional()
  @IsIn(['premium', 'standard', 'basic'])
  plan?: string;

  @IsOptional()
  @IsString()
  referralCode?: string;
}

// Listener implementation
class UserRegistrationListener implements QueueListener<UserRegistrationEvent> {
  constructor(private logger: any) {}

  async handle(message: UserRegistrationEvent): Promise<void> {
    this.logger.info('Processing user registration', {
      userId: message.userId,
      email: message.email,
      plan: message.plan || 'standard'
    });

    // Your business logic here - message is guaranteed to be valid
    await this.createUserAccount(message);
    await this.sendWelcomeEmail(message);
    
    this.logger.info('User registration completed', { userId: message.userId });
  }

  private async createUserAccount(user: UserRegistrationEvent): Promise<void> {
    // Create user account logic
  }

  private async sendWelcomeEmail(user: UserRegistrationEvent): Promise<void> {
    // Send welcome email logic
  }
}

// Setup Fastify with validation
const fastify = Fastify({ logger: true });

const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || 'us-east-1'
});

// Register plugin with comprehensive validation
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.USER_REGISTRATION_QUEUE_URL!,
  listener: {
    messageType: UserRegistrationEvent,
    listener: new UserRegistrationListener(fastify.log)
  },
  sqsClient,
  enableValidation: true,
  validationFailureMode: ValidationFailureMode.ACKNOWLEDGE, // Remove invalid messages
  validatorOptions: {
    whitelist: true, // Remove unknown properties
    forbidNonWhitelisted: true, // Reject messages with unknown properties
    stopAtFirstError: false, // Collect all validation errors
    validationError: {
      target: false, // Don't include the target object in error
      value: false   // Don't include the invalid value in error
    }
  }
});

await fastify.listen({ port: 3000 });
```

### Validation Error Handling

When validation fails, detailed error information is logged through Fastify's logger:

```typescript
// Example validation error log output
{
  "level": 40,
  "time": 1640995200000,
  "msg": "Message validation failed",
  "messageId": "12345-67890-abcdef",
  "validationErrors": [
    {
      "property": "email",
      "value": "invalid-email",
      "constraints": {
        "isEmail": "email must be an email"
      }
    },
    {
      "property": "age",
      "value": -5,
      "constraints": {
        "min": "age must not be less than 13"
      }
    }
  ]
}
```

### Testing Validation

You can test your validation setup using Fastify's testing utilities:

```typescript
import { test } from 'tap';
import { build } from './helper';

test('message validation', async (t) => {
  const app = build(t);
  
  // Mock SQS client for testing
  const mockSqsClient = {
    send: async () => ({ Messages: [] })
  };

  await app.register(sqsListenerPlugin, {
    queueNameOrUrl: 'test-queue',
    listener: {
      messageType: UserRegistrationEvent,
      listener: new UserRegistrationListener(app.log)
    },
    sqsClient: mockSqsClient,
    enableValidation: true,
    autoStartup: false
  });

  await app.ready();
  
  t.ok(app.sqsContainer, 'SQS container should be configured with validation');
});
```
```

## Composable QueueListener Pattern

The adapter supports the same composable QueueListener pattern as the core package, allowing you to reuse listeners across different frameworks:

### Basic QueueListener Implementation

```typescript
import { QueueListener } from '@snow-tzu/sqs-listener';

class NotificationListener implements QueueListener<NotificationEvent> {
  constructor(private logger: any) {}

  async handle(message: NotificationEvent): Promise<void> {
    this.logger.info('Sending notification', { 
      userId: message.userId,
      type: message.type 
    });
    
    await this.sendNotification(message);
  }

  private async sendNotification(notification: NotificationEvent): Promise<void> {
    // Send email, SMS, push notification, etc.
  }
}
```

### Using Composable Decorators

```typescript
import { 
  TraceQueueListener, 
  RetryQueueListener,
  QueueListener 
} from '@snow-tzu/sqs-listener';

// Create base listener
const baseListener = new NotificationListener(fastify.log);

// Add tracing
const tracedListener = new TraceQueueListener(baseListener);

// Register with plugin
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.NOTIFICATION_QUEUE_URL,
  listener:
    {
      messageType: NotificationEvent,
      listener: tracedListener
    },
  sqsClient
});
```

## Fastify Lifecycle Integration

The plugin integrates seamlessly with Fastify's lifecycle hooks:

### Automatic Startup and Shutdown

```typescript
// The plugin automatically handles lifecycle when autoStartup is true
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.QUEUE_URL,
  listener: /* your listener */,
  sqsClient,
  autoStartup: true // SQS listener starts when Fastify is ready
});

// Fastify handles shutdown automatically
await fastify.listen({ port: 3000 });

// When Fastify closes, the SQS listener stops automatically
process.on('SIGTERM', () => fastify.close());
```

### Manual Lifecycle Control

```typescript
// Disable auto-startup for manual control
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.QUEUE_URL,
  listener: /* your listener */,
  sqsClient,
  autoStartup: false
});

// Access the SQS container through Fastify instance
fastify.addHook('onReady', async () => {
  await fastify.sqsContainer.start();
  fastify.log.info('SQS listener started manually');
});

fastify.addHook('onClose', async () => {
  await fastify.sqsContainer.stop();
  fastify.log.info('SQS listener stopped');
});
```

## Logger Integration

The plugin integrates with Fastify's built-in pino logger by default:

### Using Fastify's Logger

```typescript
// The plugin automatically uses Fastify's logger
const fastify = Fastify({ 
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true
      }
    }
  }
});

class MyListener implements QueueListener<MyMessage> {
  constructor(private logger: any) {}

  async handle(message: MyMessage): Promise<void> {
    // Use structured logging with Fastify's pino logger
    this.logger.info('Processing message', {
      messageId: message.id,
      timestamp: new Date().toISOString()
    });
  }
}

// Pass Fastify's logger to your listener
const listener = new MyListener(fastify.log);
```

### Custom Logger Integration

```typescript
import { LoggerInterface } from '@snow-tzu/sqs-listener';

class CustomLogger implements LoggerInterface {
  log(message: string, context?: any): void {
    console.log(`[INFO] ${message}`, context);
  }

  error(message: string, context?: any): void {
    console.error(`[ERROR] ${message}`, context);
  }

  warn(message: string, context?: any): void {
    console.warn(`[WARN] ${message}`, context);
  }

  debug(message: string, context?: any): void {
    console.debug(`[DEBUG] ${message}`, context);
  }
}

// Use custom logger with plugin
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.QUEUE_URL,
  listener: /* your listener */,
  sqsClient,
  logger: new CustomLogger()
});
```

## Error Handling

The plugin integrates with Fastify's error handling system:

### Fastify Error Integration

```typescript
// Errors are automatically logged through Fastify's logger
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ error: 'Internal Server Error' });
});

// SQS processing errors are emitted through Fastify's error system
class ErrorProneListener implements QueueListener<MyMessage> {
  async handle(message: MyMessage): Promise<void> {
    if (message.shouldFail) {
      throw new Error('Processing failed');
    }
    // Process normally
  }
}
```

### Custom Error Handling

```typescript
import { QueueListenerErrorHandler } from '@snow-tzu/sqs-listener';

class CustomErrorHandler implements QueueListenerErrorHandler {
  constructor(private logger: any) {}

  async handleError(error: Error, message: any, context: any): Promise<void> {
    this.logger.error('SQS message processing failed', {
      error: error.message,
      messageId: context.getMessageId(),
      stack: error.stack
    });
    
    // Send to dead letter queue, alert monitoring, etc.
  }
}

await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.QUEUE_NAME,
  listener: /* your listener */,
  sqsClient,
  errorHandler: new CustomErrorHandler(fastify.log)
});
```

## TypeScript Support

The plugin provides full TypeScript support with proper Fastify type augmentation:

### Type-Safe Plugin Registration

```typescript
import { FastifyInstance } from 'fastify';
import { sqsListenerPlugin, FastifySqsListenerOptions } from '@snow-tzu/fastify-sqs-listener';

declare module 'fastify' {
  interface FastifyInstance {
    sqsContainer: SqsMessageListenerContainer;
  }
}

const fastify: FastifyInstance = Fastify();

const options: FastifySqsListenerOptions = {
  queueNameOrUrl: process.env.QUEUE_URL!,
  listener: 
    {
      messageType: MyMessage,
      listener: new MyListener()
    },
  sqsClient: new SQSClient({ region: 'us-east-1' })
};

await fastify.register(sqsListenerPlugin, options);
```

### Generic Message Types

```typescript
interface UserEvent {
  userId: string;
  action: 'created' | 'updated' | 'deleted';
  timestamp: string;
}

class UserEventListener implements QueueListener<UserEvent> {
  async handle(message: UserEvent): Promise<void> {
    // TypeScript provides full type safety here
    console.log(`User ${message.userId} ${message.action} at ${message.timestamp}`);
  }
}
```

## Advanced Examples

### Multiple Queue Listeners

```typescript
// Register multiple listeners for different message types
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.ORDER_QUEUE_URL,
  listener: 
    {
      messageType: OrderCreatedEvent,
      listener: new TraceQueueListener(new OrderListener(fastify.log))
    },
  sqsClient
});

// Register another plugin instance for a different queue
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.NOTIFICATION_QUEUE_URL,
  listener: 
    {
      messageType: NotificationEvent,
      listener: new NotificationListener(fastify.log)
    },
  sqsClient
});
```

### Integration with Fastify Plugins

```typescript
import fastifyRedis from '@fastify/redis';
import fastifyMongodb from '@fastify/mongodb';

// Register other Fastify plugins
await fastify.register(fastifyRedis, {
  host: 'localhost',
  port: 6379
});

await fastify.register(fastifyMongodb, {
  url: 'mongodb://localhost:27017/mydb'
});

// Use dependencies in your listeners
class OrderListener implements QueueListener<OrderCreatedEvent> {
  constructor(
    private logger: any,
    private redis: any,
    private mongodb: any
  ) {}

  async handle(message: OrderCreatedEvent): Promise<void> {
    // Use Redis for caching
    await this.redis.set(`order:${message.orderId}`, JSON.stringify(message));
    
    // Use MongoDB for persistence
    await this.mongodb.db.collection('orders').insertOne(message);
    
    this.logger.info('Order processed and cached', { orderId: message.orderId });
  }
}

// Register SQS plugin with access to other plugins
await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: process.env.ORDER_QUEUE_URL,
  listener: 
    {
      messageType: OrderCreatedEvent,
      listener: new OrderListener(fastify.log, fastify.redis, fastify.mongo)
    },
  sqsClient
});
```

## Testing

### Testing with Fastify's Test Utilities

```typescript
import { test } from 'tap';
import { build } from './helper'; // Fastify test helper

test('SQS plugin registration', async (t) => {
  const app = build(t);
  
  await app.register(sqsListenerPlugin, {
    queueNameOrUrl: 'test-queue',
    listener: 
      {
        messageType: TestMessage,
        listener: new TestListener()
      },
    sqsClient: mockSqsClient,
    autoStartup: false // Don't start in tests
  });

  await app.ready();
  
  t.ok(app.sqsContainer, 'SQS container should be available');
});
```

## Migration from Core Package

If you're currently using the core package directly with Fastify, migration is straightforward:

### Before (Core Package)

```typescript
import Fastify from 'fastify';
import { SqsMessageListenerContainer } from '@snow-tzu/sqs-listener';

const fastify = Fastify();
const container = new SqsMessageListenerContainer(sqsClient, fastify.log);

container.configure(options => {
  options
    .queueName('my-queue')
    .messageType(MyMessage)
    .autoStartup(false);
});

container.setMessageListener(new MyListener());

fastify.addHook('onReady', () => container.start());
fastify.addHook('onClose', () => container.stop());
```

### After (Fastify Plugin)

```typescript
import Fastify from 'fastify';
import { sqsListenerPlugin } from '@snow-tzu/fastify-sqs-listener';

const fastify = Fastify();

await fastify.register(sqsListenerPlugin, {
  queueNameOrUrl: 'my-queue',
  listener: 
    {
      messageType: MyMessage,
      listener: new MyListener()
    },
  sqsClient,
  autoStartup: true // Automatic lifecycle management
});
```

## Related Packages

- **[@snow-tzu/sqs-listener](https://www.npmjs.com/package/@snow-tzu/sqs-listener)** - Framework-agnostic core package
- **[@snow-tzu/express-sqs-listener](https://www.npmjs.com/package/@snow-tzu/express-sqs-listener)** - Express adapter
- **[@snow-tzu/nest-sqs-listener](https://www.npmjs.com/package/@snow-tzu/nest-sqs-listener)** - NestJS adapter

## License

MIT

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests to our GitHub repository.

## Support

- 📖 [Documentation](https://github.com/ganesanarun/sqs-listener#readme)
- 🐛 [Issue Tracker](https://github.com/ganesanarun/sqs-listener/issues)
- 💬 [Discussions](https://github.com/ganesanarun/sqs-listener/discussions)