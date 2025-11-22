# NestJS Basic Batch Acknowledgement Example

This example demonstrates basic batch acknowledgement functionality in a NestJS application using the `@snow-tzu/nest-sqs-listener` package.

## Features Demonstrated

- ✅ Basic batch acknowledgement configuration
- ✅ Automatic message batching and flushing
- ✅ Cost-effective SQS API usage (up to 90% reduction in API calls)
- ✅ Simple setup with default batch settings
- ✅ Message validation with class-validator
- ✅ Graceful shutdown with batch flushing

## Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for LocalStack)
- AWS account (optional, for production testing)

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

**For LocalStack (local testing):**
```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=test
AWS_SECRET_ACCESS_KEY=test
AWS_ENDPOINT=http://localhost:4566
ORDER_QUEUE_NAME=order-events-batch
```

### 3. Start LocalStack

From the examples directory:
```bash
cd ../../
docker-compose up -d
```

### 4. Create Queue

```bash
cd ../../scripts
./setup-queues.sh
```

Or manually create the batch queue:
```bash
aws sqs create-queue \
  --queue-name order-events-batch \
  --endpoint-url http://localhost:4566
```

## Running

Start the application:

```bash
npm run start:dev
```

You should see output indicating batch acknowledgements are enabled:
```
[Bootstrap] Starting NestJS Batch Acknowledgement Example...
[OrderBatchContainer] Creating Order Batch Container
[OrderBatchContainer] Batch acknowledgements enabled: maxSize=10, flushInterval=100ms
[OrderBatchContainer] Order Batch Container configured successfully
[Bootstrap] Application initialized successfully
[Bootstrap] SQS listeners are now active and polling for messages
```

## Testing

### Send Test Messages

Send multiple messages to see batching in action:

```bash
# Send 15 messages to demonstrate batching
for i in {1..15}; do
  aws sqs send-message \
    --queue-url http://localhost:4566/000000000000/order-events-batch \
    --message-body "{
      \"orderId\": \"order-$i\",
      \"customerId\": \"customer-$i\",
      \"amount\": $(($i * 10 + 99)),
      \"items\": [
        {\"productId\": \"prod-$i\", \"quantity\": $i}
      ]
    }" \
    --endpoint-url http://localhost:4566
done
```

### Expected Output

You should see logs showing batch acknowledgement behavior:

```
[OrderBatchListener] Processing order order-1 for customer customer-1
[OrderBatchService] Order order-1 processed successfully
[BatchAckManager] Queued message xxx for batch acknowledgement (1/10)
[OrderBatchListener] Processing order order-2 for customer customer-2
[OrderBatchService] Order order-2 processed successfully
[BatchAckManager] Queued message yyy for batch acknowledgement (2/10)
...
[OrderBatchListener] Processing order order-10 for customer customer-10
[OrderBatchService] Order order-10 processed successfully
[BatchAckManager] Batch acknowledging 10 messages from queue order-events-batch
[BatchAckManager] Successfully acknowledged batch of 10 messages
...
[BatchAckManager] Flushing pending batch acknowledgements (5 messages)
[BatchAckManager] Successfully acknowledged batch of 5 messages
```

## Code Structure

```
src/
├── main.ts                          # Application entry point
├── app.module.ts                    # Root module
├── config/
│   └── aws.config.ts               # SQS client configuration
├── events/
│   └── order-created.event.ts      # Event data model with validation
├── listeners/
│   └── order-batch.listener.ts     # Message listener
├── services/
│   └── order-batch.service.ts      # Business logic
└── modules/
    ├── aws.module.ts               # AWS client provider
    └── order-batch.module.ts       # Container with batch acknowledgement
```

## Key Configuration

The batch acknowledgement is configured in `order-batch.module.ts`:

```typescript
container.configure(options => {
  options
    .queueName('order-events-batch')
    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
    .maxConcurrentMessages(5)
    // Enable batch acknowledgements with default settings
    .enableBatchAcknowledgement(true)
    // Optional: customize batch settings
    // .batchAcknowledgementOptions(10, 100) // maxSize=10, flushInterval=100ms
    .targetClass(OrderCreatedEvent)
    .enableValidation(true);
});
```

## Batch Acknowledgement Behavior

### Automatic Batching
1. **Message Processed**: Successfully processed messages are queued for batch acknowledgement
2. **Batch Full**: When 10 messages are queued, they're automatically acknowledged in a single API call
3. **Timer Flush**: If fewer than 10 messages are queued, they're flushed after 100ms
4. **Shutdown Flush**: All pending messages are flushed when the container stops

### Performance Impact

With 100 messages:
- **Without batching**: 100 individual `DeleteMessage` API calls
- **With batching**: ~10 `DeleteMessageBatch` API calls (90% reduction)

### Cost Savings

Assuming $0.0000004 per SQS request:
- **100,000 messages/day without batching**: $0.04
- **100,000 messages/day with batching**: $0.004
- **Daily savings**: $0.036 (~90% cost reduction)

## Monitoring Batch Efficiency

Enable debug logging to see batch behavior:

```typescript
// In main.ts or app configuration
const logger = new Logger('BatchMonitor');
logger.debug('Batch acknowledgement metrics enabled');
```

Look for these log patterns:
- `Queued message xxx for batch acknowledgement (N/10)` - Messages being batched
- `Batch acknowledging N messages` - Full batch being processed
- `Flushing pending batch acknowledgements` - Timer-based flush
- `Successfully acknowledged batch of N messages` - Successful batch processing

## Graceful Shutdown

The example demonstrates proper shutdown handling:

```typescript
// In main.ts
process.on('SIGTERM', async () => {
  await app.close(); // This triggers container.stop() which flushes pending batches
});
```

This ensures all pending batch acknowledgements are flushed before the application exits.

## Comparison with Non-Batch Example

| Aspect | Without Batching | With Batching |
|--------|------------------|---------------|
| API Calls | 1 per message | 1 per ~10 messages |
| Cost | Higher | ~90% lower |
| Latency | Immediate | Slight delay (100ms max) |
| Complexity | Simple | Automatic |

## Next Steps

- Check out the [Advanced NestJS Example](../nestjs-advanced) for:
  - Custom batch configurations
  - Multiple queues with different batch settings
  - Production monitoring patterns
- Explore other framework examples:
  - [Fastify Basic](../fastify-basic)
  - [Express Basic](../express-basic)
  - [Vanilla Node.js](../vanilla-nodejs-basic)

## Troubleshooting

### Messages Not Being Deleted

**Problem**: Messages reappear in the queue after processing.

**Solution**: Ensure batch acknowledgements are enabled:
```typescript
.enableBatchAcknowledgement(true)
```

### High Message Processing Latency

**Problem**: Messages take longer to be acknowledged.

**Solution**: Reduce a flush interval for faster acknowledgement:
```typescript
.enableBatchAcknowledgement(true)
.batchAcknowledgementOptions(10, 50) // Flush every 50ms instead of 100ms
```

### Partial Message Loss on Shutdown

**Problem**: Some messages are not deleted when the application stops.

**Solution**: Ensure a graceful shutdown:
```typescript
await app.close(); // Must await the close operation
```

## Resources

- [Batch Acknowledgement Documentation](../../packages/core/docs/BATCH_ACKNOWLEDGEMENT.md)
- [NestJS SQS Listener Documentation](../../packages/nestjs-adapter/README.md)
- [Performance Benchmarks](../../README.md#performance)