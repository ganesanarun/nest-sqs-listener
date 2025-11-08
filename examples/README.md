# NestJS SQS Listener - Examples

This directory contains practical examples demonstrating how to use the `@snow-tzu/nestjs-sqs-listener` package in real-world scenarios. Each example is a complete, runnable NestJS application that you can use as a starting point for your own projects.

## Overview

The examples progress from simple to advanced, showing different features and patterns:

| Example | Complexity | Features | Best For |
|---------|-----------|----------|----------|
| [Basic](./basic) | ⭐ | Single queue, automatic acknowledgement, simple setup | Getting started, learning the basics |
| [Advanced](./advanced) | ⭐⭐⭐ | Multiple queues, listener decorators, tracing, custom error handling, multiple AWS accounts | Production patterns, complex use cases |

## Prerequisites

Before running any example, ensure you have:

- **Node.js 18+** and npm installed
- **Docker and Docker Compose** (for LocalStack local testing)
- **AWS CLI** (optional, for AWS testing)
- **AWS Account** (optional, for production testing)

## Quick Start with LocalStack

LocalStack allows you to test SQS functionality locally without AWS credentials or costs.

### 1. Start LocalStack

From this directory:

```bash
docker-compose up -d
```

This starts LocalStack with SQS service on port 4566.

### 2. Create Queues

```bash
./scripts/setup-queues.sh
```

This creates the necessary SQS queues in LocalStack:
- `order-events` - For order processing messages
- `notification-events` - For notification messages

### 3. Run an Example

Navigate to an example directory and follow its README:

```bash
cd basic
npm install
cp .env.example .env
npm run start:dev
```

### 4. Send Test Messages

From the examples directory:

```bash
./scripts/send-test-messages.sh localstack
```

You should see messages being processed in the application logs.

## Examples

### Basic Example

**Path:** `./basic`

A minimal example showing core functionality with a single queue listener. Perfect for getting started.

**What you'll learn:**
- How to set up a basic SQS listener
- Automatic message acknowledgement (ON_SUCCESS mode)
- Separating business logic from infrastructure
- LocalStack setup for local testing

**Key files:**
- `order-created.listener.ts` - Simple listener implementation
- `order.module.ts` - Container configuration
- `order.service.ts` - Business logic separation

[View Basic Example →](./basic)

### Advanced Example

**Path:** `./advanced`

A comprehensive example demonstrating production-ready patterns and advanced features.

**What you'll learn:**
- Listener decorator pattern for cross-cutting concerns (tracing, logging, metrics)
- OpenTelemetry distributed tracing implementation
- Custom error handling with retry logic
- Manual message acknowledgement
- Multiple queue listeners with different configurations
- Connecting to multiple AWS accounts
- Symbol-based dependency injection for type safety

**Key files:**
- `tracing.listener.ts` - Decorator pattern for adding tracing
- `custom-error.handler.ts` - Custom error handling logic
- `tokens.ts` - Symbol-based DI tokens
- `notification.listener.ts` - Manual acknowledgement example

[View Advanced Example →](./advanced)

## Common Commands

### LocalStack Management

```bash
# Start LocalStack
docker-compose up -d

# Stop LocalStack
docker-compose down

# View LocalStack logs
docker-compose logs -f localstack

# Restart LocalStack
docker-compose restart
```

### Queue Management

```bash
# Create queues in LocalStack
./scripts/setup-queues.sh

# List queues
aws sqs list-queues --endpoint-url http://localhost:4566

# Purge a queue (remove all messages)
aws sqs purge-queue \
  --queue-url http://localhost:4566/000000000000/order-events \
  --endpoint-url http://localhost:4566

# Get queue attributes
aws sqs get-queue-attributes \
  --queue-url http://localhost:4566/000000000000/order-events \
  --attribute-names All \
  --endpoint-url http://localhost:4566
```

### Testing

```bash
# Send test messages to LocalStack
./scripts/send-test-messages.sh localstack

# Send test messages to AWS
./scripts/send-test-messages.sh aws

# Send a single order message
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/order-events \
  --message-body '{"orderId":"123","customerId":"456","amount":99.99}' \
  --endpoint-url http://localhost:4566

# Send a single notification message
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/notification-events \
  --message-body '{"userId":"user-123","type":"email","message":"Hello!"}' \
  --endpoint-url http://localhost:4566
```

## Testing with AWS

To test with real AWS SQS queues instead of LocalStack:

### 1. Create Queues in AWS

```bash
# Create order queue
aws sqs create-queue --queue-name order-events --region us-east-1

# Create notification queue
aws sqs create-queue --queue-name notification-events --region us-east-1
```

### 2. Configure AWS Credentials

Update the `.env` file in your example directory with real AWS credentials:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
# Remove or comment out AWS_ENDPOINT for real AWS
```

### 3. Run the Example

```bash
npm run start:dev
```

### 4. Send Test Messages

```bash
./scripts/send-test-messages.sh aws
```

## Project Structure

```
examples/
├── README.md                    # This file
├── docker-compose.yml           # LocalStack configuration
├── scripts/
│   ├── setup-queues.sh         # Create SQS queues
│   └── send-test-messages.sh   # Send test messages
├── basic/                       # Basic example
│   ├── README.md
│   ├── package.json
│   ├── .env.example
│   └── src/
└── advanced/                    # Advanced example
    ├── README.md
    ├── package.json
    ├── .env.example
    └── src/
```

## Troubleshooting

### LocalStack not starting

**Problem:** Docker container fails to start or exits immediately.

**Solutions:**
- Ensure Docker is running: `docker ps`
- Check port 4566 is not in use: `lsof -i :4566`
- View logs: `docker-compose logs localstack`
- Try restarting: `docker-compose down && docker-compose up -d`

### Cannot connect to LocalStack

**Problem:** Application cannot connect to LocalStack endpoint.

**Solutions:**
- Verify LocalStack is running: `docker-compose ps`
- Check endpoint URL in `.env` is `http://localhost:4566`
- Ensure AWS credentials are set to `test` for LocalStack
- Try accessing LocalStack directly: `aws sqs list-queues --endpoint-url http://localhost:4566`

### Messages not being received

**Problem:** Application starts but no messages are processed.

**Solutions:**
- Verify queues exist: `aws sqs list-queues --endpoint-url http://localhost:4566`
- Check queue names in `.env` match created queues
- Send a test message: `./scripts/send-test-messages.sh localstack`
- Check application logs for errors
- Verify container is configured with `autoStartup: true`

### Permission denied on scripts

**Problem:** Cannot execute setup or test scripts.

**Solution:**
```bash
chmod +x scripts/*.sh
```

### Messages processed multiple times

**Problem:** Same message is processed repeatedly.

**Solutions:**
- Check visibility timeout is sufficient for processing time
- Ensure acknowledgement is happening (check logs)
- For MANUAL mode, verify `context.acknowledge()` is called
- Check for errors in listener that prevent acknowledgement

## Next Steps

1. **Start with the Basic Example** - Get familiar with core concepts
2. **Explore the Advanced Example** - Learn production patterns
3. **Read the Main Package Documentation** - Understand all available options
4. **Build Your Own** - Use examples as templates for your use cases

## Additional Resources

- [Main Package Documentation](../README.md) - Complete API reference
- [AWS SQS Documentation](https://docs.aws.amazon.com/sqs/) - Learn about SQS features
- [LocalStack Documentation](https://docs.localstack.cloud/) - LocalStack setup and usage
- [NestJS Documentation](https://docs.nestjs.com/) - NestJS framework guide

## Support

If you encounter issues or have questions:

1. Check the troubleshooting section above
2. Review the example READMEs for specific guidance
3. Check the main package documentation
4. Open an issue on GitHub

## Notes

- Examples use the published `@snow-tzu/nestjs-sqs-listener` package
- For local package development, change dependency to `"file:.."`
- LocalStack is free and requires no AWS credentials
- All examples work with both LocalStack and real AWS SQS
