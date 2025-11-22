# Batch Acknowledgement Configuration

Batch acknowledgements allow you to delete multiple messages from SQS in a single API call, reducing costs and improving
throughput.

## Overview

- **Opt-in**: Batch acknowledgements are disabled by default
- **AWS Limit**: Maximum 10 messages per batch
- **Configurable**: Batch size and flush interval can be customized
- **Performance**: Reduces API calls by up to 10x

## Basic Usage

### Enable Batch Acknowledgements

```typescript
import {SqsMessageListenerContainer, AcknowledgementMode} from '@snow-tzu/sqs-listener';

const container = new SqsMessageListenerContainer(sqsClient);

container.configure(options => {
    options
        .queueName('my-queue')
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
        .enableBatchAcknowledgement(true);  // Enable batch acks
});
```

## Configuration Options

### 1. Enable/Disable Batching

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true);  // Default: false (disabled)
});
```

### 2. Configure Batch Size

Control how many messages are batched together (1-10):

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(10);  // Max batch size (default: 10)
});
```

### 3. Configure Flush Interval

Set how long to wait before flushing partial batches (in milliseconds):

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(10, 100);  // maxSize: 10, flushInterval: 100ms
});
```

## Configuration Examples

### Default Configuration (Recommended)

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true);
    // Batch size: 10 (max)
    // Flush interval: 100ms
});
```

### Small Batches (Lower Latency)

For applications where latency is critical:

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(5, 50);  // Smaller batches, faster flush
});
```

### Aggressive Batching (Lower Cost)

For maximum cost savings:

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(10, 500);  // Max size, longer wait
});
```

### Immediate Flush (No Batching)

If you want minimal latency but still use the batch API:

```typescript
container.configure(options => {
    options
        .queueName('my-queue')
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(1, 0);  // Batch of 1, immediate flush
});
```

## How It Works

### Automatic Batching

1. **Message Processed**: When a message is successfully processed, it's queued for batch acknowledgement
2. **Batch Full**: When the batch reaches the configured size (default 10), it's automatically flushed
3. **Timer Flush**: If the batch isn't full after the configured interval (default 100ms), it's flushed anyway
4. **Shutdown Flush**: When the container stops, all pending batches are flushed

### Example Flow

```
Message 1 processed → Queue (1/10)
Message 2 processed → Queue (2/10)
...
Message 10 processed → Queue (10/10) → FLUSH (DeleteMessageBatch with 10 messages)

Message 11 processed → Queue (1/10)
100ms timer expires → FLUSH (DeleteMessageBatch with 1 message)
```

## Performance Impact

### API Call Reduction

| Messages | Without Batching | With Batching (size=10) | Reduction |
|----------|------------------|-------------------------|-----------|
| 10       | 10 calls         | 1 call                  | 90%       |
| 25       | 25 calls         | 3 calls                 | 88%       |
| 100      | 100 calls        | 10 calls                | 90%       |
| 1000     | 1000 calls       | 100 calls               | 90%       |

### Cost Savings

Assuming $0.0000004 per SQS request:

| Messages/Day | Without Batching | With Batching | Savings/Day |
|--------------|------------------|---------------|-------------|
| 10,000       | $0.004           | $0.0004       | $0.0036     |
| 100,000      | $0.04            | $0.004        | $0.036      |
| 1,000,000    | $0.40            | $0.04         | $0.36       |
| 10,000,000   | $4.00            | $0.40         | $3.60       |

*Annual savings for 1M messages/day: ~$131*

## Compatibility

### Works With All Acknowledgement Modes

```typescript
// ON_SUCCESS mode (default)
container.configure(options => {
    options
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
        .enableBatchAcknowledgement(true);
});

// ALWAYS mode
container.configure(options => {
    options
        .acknowledgementMode(AcknowledgementMode.ALWAYS)
        .enableBatchAcknowledgement(true);
});

// MANUAL mode
container.configure(options => {
    options
        .acknowledgementMode(AcknowledgementMode.MANUAL)
        .enableBatchAcknowledgement(true);
});

// In manual mode, call acknowledge() as usual
listener.onMessage = async (payload, context) => {
    await context.acknowledge();  // Batched automatically
};
```

## Monitoring

### Debug Logs

Enable debug logging to see batch behavior:

```typescript
import {ConsoleLogger} from '@snow-tzu/sqs-listener';

const logger = new ConsoleLogger('MyApp');
const container = new SqsMessageListenerContainer(sqsClient, logger);

// You'll see logs like:
// "Queued message xxx for batch acknowledgement (5/10)"
// "Batch acknowledging 10 messages from queue ..."
// "Flushing pending batch acknowledgements..."
```

### Metrics to Track

1. **Batch Size Distribution**: How many messages per batch on average
2. **Flush Reasons**: Auto-flush vs. timer-flush vs. shutdown-flush
3. **API Call Count**: Total DeleteMessageBatch calls
4. **Latency Impact**: Time from processing to acknowledgement

## Best Practices

### ✅ DO

- Enable batch acknowledgements for high-volume queues (>100 msgs/day)
- Use default configuration (size=10, interval=100ms) as a starting point
- Monitor batch efficiency in production
- Combine with `maxConcurrentMessages` for optimal throughput

### ❌ DON'T

- Don't use batch acknowledgements for very low-volume queues (<10 msgs/day)
- Don't set a flush interval too high (>1000ms) as it delays acknowledgements
- Don't set batch size to 1 (defeats the purpose, just disable batching)
- Don't forget to test graceful shutdown behavior

## Troubleshooting

### Messages Not Being Deleted

**Symptom**: Messages reappear in the queue after processing

**Causes**:

1. Batch acknowledgements aren't enabled
2. Acknowledgement mode set to MANUAL without calling `context.acknowledge()`
3. Container stopped before the batch could flush

**Solution**:

```typescript
container.configure(options => {
    options
        .enableBatchAcknowledgement(true)
        .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
        .batchAcknowledgementOptions(10, 100);  // Ensure reasonable flush interval
});
```

### High Latency

**Symptom**: Messages take longer to be acknowledged

**Cause**: Flush interval too high or batch size too large

**Solution**: Reduce flush interval or batch size

```typescript
container.configure(options => {
    options
        .enableBatchAcknowledgement(true)
        .batchAcknowledgementOptions(5, 50);  // Smaller, faster batches
});
```

### Partial Batch Loss on Shutdown

**Symptom**: Some messages are not deleted when the container stops

**Cause**: This shouldn't happen - the container automatically flushes on shutdown

**Solution**: Ensure you're calling `await container.stop()` properly

```typescript
process.on('SIGTERM', async () => {
    await container.stop();  // MUST await
    process.exit(0);
});
```

## Migration Guide

### From Single-Message Acknowledgements

If you're currently not using batch acknowledgements:

1. **Enable batching**:
   ```
   .enableBatchAcknowledgement(true)
   ```

2. **Test in staging**: Verify messages are still being deleted
3. **Monitor API calls**: Should see ~90% reduction
4. **Gradually roll out**: Deploy to production incrementally

### Rolling Back

To disable batch acknowledgements:

```typescript
container.configure(options => {
    options
        .enableBatchAcknowledgement(false);  // or just omit the line
});
```

No code changes needed - falls back to single-message deletes.

## See Also

- [Performance Benchmarks](../../../README.md#performance)
- [Container Configuration](../README.md#configuration-options)
- [AWS SQS DeleteMessageBatch API](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_DeleteMessageBatch.html)
