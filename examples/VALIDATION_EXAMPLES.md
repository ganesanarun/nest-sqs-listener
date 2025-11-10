# Message Validation Examples

This document provides comprehensive examples of using class-validator integration with `@snow-tzu/nest-sqs-listener`.

## Table of Contents

- [Overview](#overview)
- [Basic Validation](#basic-validation)
- [Validation Failure Modes](#validation-failure-modes)
- [Advanced Validation Patterns](#advanced-validation-patterns)
- [Custom Error Handling](#custom-error-handling)
- [Testing Validation](#testing-validation)

## Overview

The library integrates with `class-validator` to automatically validate incoming SQS messages before they reach your business logic. This ensures data integrity and provides clear error messages for invalid payloads.

**Key Features:**
- Automatic validation using decorators
- Three validation failure modes (THROW, ACKNOWLEDGE, REJECT)
- Nested object and array validation
- Graceful degradation when class-validator is not installed
- Custom error handling for validation failures

## Basic Validation

### Step 1: Install Dependencies

```bash
npm install class-validator class-transformer
```

### Step 2: Add Decorators to Event Class

```typescript
import { IsString, IsNumber, IsPositive, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderCreatedEvent {
  @IsString()
  orderId: string;

  @IsString()
  customerId: string;

  @IsNumber()
  @IsPositive()
  amount: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItem)
  items: OrderItem[];
}

export class OrderItem {
  @IsString()
  productId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}
```

### Step 3: Enable Validation in Container

```typescript
container.configure(options => {
  options
    .queueNames('order-events')
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validatorOptions({
      whitelist: true, // Strip properties without decorators
    });
});
```

## Validation Failure Modes

The library provides three modes for handling validation failures:

### THROW Mode (Default)

Throws `MessageValidationError` and invokes the error handler. Use this when you need custom error handling logic.

```typescript
import { ValidationFailureMode } from '@snow-tzu/nest-sqs-listener';

container.configure(options => {
  options
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.THROW)
    .validatorOptions({
      whitelist: true,
      forbidNonWhitelisted: true,
    });
});

// Set custom error handler
container.setErrorHandler(customErrorHandler);
```

**When to use:**
- Critical queues requiring monitoring
- Need to send validation errors to alerting systems
- Want to implement custom retry logic
- Need to route invalid messages to special handling queues

### ACKNOWLEDGE Mode

Automatically acknowledges (removes) invalid messages from the queue without invoking the error handler.

```typescript
container.configure(options => {
  options
    .targetClass(NotificationEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
    .validatorOptions({
      whitelist: true,
    });
});
```

**When to use:**
- Non-critical queues where invalid messages can be discarded
- Want to avoid error handler overhead
- Invalid messages are logged but don't trigger alerts
- Messages that won't become valid on retry

### REJECT Mode

Logs validation errors but doesn't acknowledge the message, allowing SQS to retry and eventually move to DLQ.

```typescript
container.configure(options => {
  options
    .targetClass(PaymentEvent)
    .enableValidation(true)
    .validationFailureMode(ValidationFailureMode.REJECT)
    .validatorOptions({
      whitelist: true,
    });
});
```

**When to use:**
- Want messages to retry naturally
- Have a dead-letter queue configured
- Need to preserve invalid messages for later analysis
- Don't want to invoke error handler

### Mode Comparison Table

| Mode | Throws Error | Invokes Error Handler | Acknowledges Message | Message Retries | Use Case |
|------|--------------|----------------------|---------------------|----------------|----------|
| **THROW** | ✅ Yes | ✅ Yes | ⚠️ Depends on handler | ⚠️ Depends on handler | Critical queues, custom handling |
| **ACKNOWLEDGE** | ❌ No | ❌ No | ✅ Yes | ❌ No | Discard invalid messages |
| **REJECT** | ❌ No | ❌ No | ❌ No | ✅ Yes (→ DLQ) | Preserve for analysis |

## Advanced Validation Patterns

### Nested Object Validation

```typescript
import { IsString, IsEmail, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class UserRegisteredEvent {
  @IsString()
  userId: string;

  @ValidateNested()
  @Type(() => UserProfile)
  profile: UserProfile;

  @ValidateNested()
  @Type(() => Address)
  @IsOptional()
  address?: Address;
}

export class UserProfile {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;
}

export class Address {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  zipCode: string;
}
```

### Array Validation

```typescript
import { IsArray, ValidateNested, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { Type } from 'class-transformer';

export class BatchOrderEvent {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @ValidateNested({ each: true })
  @Type(() => Order)
  orders: Order[];
}

export class Order {
  @IsString()
  orderId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
```

### Conditional Validation

```typescript
import { IsString, IsNumber, ValidateIf, IsIn } from 'class-validator';

export class PaymentEvent {
  @IsString()
  paymentId: string;

  @IsIn(['credit_card', 'paypal', 'bank_transfer'])
  paymentMethod: string;

  @ValidateIf(o => o.paymentMethod === 'credit_card')
  @IsString()
  cardToken?: string;

  @ValidateIf(o => o.paymentMethod === 'paypal')
  @IsString()
  paypalEmail?: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
```

### Custom Validators

```typescript
import { registerDecorator, ValidationOptions, ValidationArguments } from 'class-validator';

export function IsValidOrderStatus(validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isValidOrderStatus',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
          return typeof value === 'string' && validStatuses.includes(value);
        },
        defaultMessage(args: ValidationArguments) {
          return 'Order status must be one of: pending, processing, completed, cancelled';
        },
      },
    });
  };
}

export class OrderStatusChangedEvent {
  @IsString()
  orderId: string;

  @IsValidOrderStatus()
  status: string;
}
```

### Whitelist and Forbid Non-Whitelisted

```typescript
// Strip extra properties
container.configure(options => {
  options
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validatorOptions({
      whitelist: true, // Remove properties without decorators
      forbidNonWhitelisted: false, // Don't throw error for extra properties
    });
});

// Reject messages with extra properties
container.configure(options => {
  options
    .targetClass(OrderCreatedEvent)
    .enableValidation(true)
    .validatorOptions({
      whitelist: true,
      forbidNonWhitelisted: true, // Throw error if extra properties exist
    });
});
```

## Custom Error Handling

### Handling Validation Errors in Error Handler

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { MessageContext, MessageValidationError, QueueListenerErrorHandler } from '@snow-tzu/nest-sqs-listener';

@Injectable()
export class CustomErrorHandler implements QueueListenerErrorHandler {
  private readonly logger = new Logger(CustomErrorHandler.name);

  async handleError(error: Error, message: any, context: MessageContext): Promise<void> {
    // Handle validation errors specifically
    if (error instanceof MessageValidationError) {
      this.logger.error(`Validation failed for message ${context.getMessageId()}`);
      this.logger.error(`Target class: ${error.targetClass}`);
      this.logger.error('Validation errors:');
      this.logger.error(error.getFormattedErrors());
      
      // Get structured constraint information
      const constraints = error.getConstraints();
      for (const { property, constraints: msgs } of constraints) {
        this.logger.error(`  ${property}: ${msgs.join(', ')}`);
      }
      
      // Acknowledge invalid messages to prevent infinite retries
      this.logger.warn('Acknowledging invalid message');
      await context.acknowledge();
      
      // Optionally: Send to monitoring/alerting system
      // await this.alertingService.sendAlert('validation_error', error);
      
      return;
    }

    // Handle other errors
    this.logger.error(`Error processing message: ${error.message}`);
    
    if (context.getApproximateReceiveCount() > 3) {
      this.logger.warn('Max retries exceeded, acknowledging message');
      await context.acknowledge();
    }
  }
}
```

### Accessing Validation Error Details

```typescript
if (error instanceof MessageValidationError) {
  // Get formatted error string
  const formatted = error.getFormattedErrors();
  console.log(formatted);
  // Output:
  //   - orderId: orderId must be a string
  //   - amount: amount must be a positive number
  
  // Get structured constraints
  const constraints = error.getConstraints();
  constraints.forEach(({ property, constraints }) => {
    console.log(`Property: ${property}`);
    console.log(`Constraints: ${constraints.join(', ')}`);
  });
  
  // Access original message body
  console.log('Original body:', error.originalBody);
  
  // Access target class name
  console.log('Target class:', error.targetClass);
  
  // Access raw validation errors
  console.log('Raw errors:', error.validationErrors);
}
```

## Testing Validation

### Valid Message

```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "8355f7f5-c70e-4f18-b560-fa9af31f4e85",
    "customerId": "800f817a-3c4c-4840-8692-d3afae381cdd",
    "amount": 99.99,
    "items": [
      {"productId": "prod-1", "quantity": 2},
      {"productId": "prod-2", "quantity": 1}
    ]
  }' \
  --endpoint-url http://localhost:4566
```

### Invalid Messages for Testing

**Negative amount:**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": -50,
    "items": [{"productId": "prod-1", "quantity": 2}]
  }' \
  --endpoint-url http://localhost:4566
```

**Invalid quantity (less than 1):**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": 99.99,
    "items": [{"productId": "prod-1", "quantity": 0}]
  }' \
  --endpoint-url http://localhost:4566
```

**Missing required field:**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "amount": 99.99,
    "items": [{"productId": "prod-1", "quantity": 2}]
  }' \
  --endpoint-url http://localhost:4566
```

**Extra properties (with forbidNonWhitelisted):**
```bash
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{
    "orderId": "order-123",
    "customerId": "customer-456",
    "amount": 99.99,
    "items": [{"productId": "prod-1", "quantity": 2}],
    "extraField": "should not be here"
  }' \
  --endpoint-url http://localhost:4566
```

### Expected Log Output

**Valid message:**
```
[OrderCreatedListener] Received order message: <message-id>
[OrderService] Processing order order-123 for customer customer-456
[OrderService] Order order-123 processed successfully
```

**Invalid message (THROW mode):**
```
[CustomErrorHandler] Validation failed for message <message-id>
[CustomErrorHandler] Target class: OrderCreatedEvent
[CustomErrorHandler] Validation errors:
[CustomErrorHandler]   - amount: amount must be a positive number
[CustomErrorHandler] Acknowledging invalid message
```

**Invalid message (ACKNOWLEDGE mode):**
```
[JsonPayloadMessagingConverter] Validation failed for OrderCreatedEvent
[JsonPayloadMessagingConverter]   - amount: amount must be a positive number
[JsonPayloadMessagingConverter] Acknowledging invalid message
```

## Best Practices

1. **Always use validation for production queues** - Prevents invalid data from reaching your business logic

2. **Choose the right failure mode:**
   - Use THROW for critical queues where you need monitoring
   - Use ACKNOWLEDGE for non-critical queues to discard invalid messages
   - Use REJECT when you want messages to move to DLQ

3. **Use whitelist mode** - Strip unexpected properties to prevent injection attacks

4. **Validate nested objects** - Use `@ValidateNested()` and `@Type()` for complex structures

5. **Handle validation errors in error handler** - Acknowledge invalid messages to prevent infinite retries

6. **Log validation errors** - Keep track of invalid messages for debugging and monitoring

7. **Test with invalid messages** - Ensure your validation rules work as expected

8. **Use custom validators** - Create reusable validators for domain-specific rules

9. **Document validation rules** - Make it clear what constitutes a valid message

10. **Monitor validation failures** - Track validation errors to identify data quality issues

## See Also

- [Basic Example](./basic) - Simple validation setup
- [Advanced Example](./advanced) - Multiple failure modes and custom error handling
- [class-validator Documentation](https://github.com/typestack/class-validator)
- [class-transformer Documentation](https://github.com/typestack/class-transformer)
