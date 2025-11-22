# Benchmark Suite

Performance benchmarks for `@snow-tzu/sqs-listener` to measure throughput, latency, and memory usage.

## Prerequisites

LocalStack must be running on `localhost:4566` before running benchmarks.

```bash
docker run --rm -d -p 4566:4566 localstack/localstack:2.3
```

## Running Benchmarks

### Run All Benchmarks

```bash
yarn benchmark
```

This will run all three benchmark suites in sequence:
1. Throughput Benchmark
2. Latency Benchmark
3. Memory Benchmark

### Run Individual Benchmarks

```bash
# Throughput benchmark only
yarn benchmark:throughput

# Latency benchmark only
yarn benchmark:latency

# Memory benchmark only
yarn benchmark:memory
```

## Benchmark Descriptions

### 1. Throughput Benchmark

**Measures**: Messages processed per second at different concurrency levels

**Tests**:
- Concurrency levels: 1, 5, 10, 20
- 100 messages per test
- Measures throughput (msgs/sec) and average latency

**Metrics**:
- Throughput (messages/second)
- Processing duration
- Average latency
- Best performing concurrency level

### 2. Latency Benchmark

**Measures**: End-to-end message processing latency

**Tests**:
- 200 messages
- Concurrency: 10
- Tracks latency from message send to processing completion

**Metrics**:
- Mean latency
- Median (p50)
- p95 and p99 percentiles
- Min/Max latency
- Standard deviation
- Latency distribution chart

### 3. Memory Benchmark

**Measures**: Heap memory usage under sustained load

**Tests**:
- Small messages (100 bytes) - 200 messages
- Medium messages (1KB) - 100 messages
- Large messages (10KB) - 50 messages

**Metrics**:
- Baseline memory
- Peak memory during processing
- End memory after processing
- Memory increase
- Average memory per message
- Memory efficiency analysis

## Understanding Results

### Good Performance Indicators

✅ **Throughput**: 
- \> 50 msgs/sec for concurrency 10+
- Linear scaling with concurrency (up to a point)

✅ **Latency**:
- p50 < 100ms
- p95 < 500ms
- p99 < 1000ms

✅ **Memory**:
- Average increase < 50MB for test scenarios
- No significant memory leaks
- Stable memory after processing completes

### Performance Optimization Tips

If benchmarks show poor performance:

1. **Low Throughput**:
   - Increase `maxConcurrentMessages`
   - Reduce `pollTimeout` for faster polling
   - Check network latency to LocalStack/AWS

2. **High Latency**:
   - Optimize listener processing logic
   - Reduce message payload size
   - Check if error handling is being triggered

3. **High Memory Usage**:
   - Reduce `maxConcurrentMessages`
   - Check for memory leaks in listener code
   - Ensure proper cleanup in error handlers

## Example Output

```
🚀 Starting Throughput Benchmark

📊 Testing concurrency level: 10
   ✓ Messages sent to queue
   ⏳ Processing messages...
   ✓ Test complete
   ├─ Duration: 2.34s
   ├─ Throughput: 42.74 msgs/sec
   └─ Avg Latency: 245.67ms

🏆 Best Throughput: 87.32 msgs/sec at concurrency level 20
```

## Advanced Options

### Enable Garbage Collection Tracking

For more accurate memory benchmarks:

```bash
node --expose-gc node_modules/.bin/ts-node benchmark/memory.bench.ts
```

### Custom Message Sizes

Edit the benchmark files to test with different message sizes:

```typescript
// In memory.bench.ts
const scenarios = [
    { name: 'Custom Size', size: 5120, count: 100, concurrency: 10 },
];
```

## Continuous Integration

Add benchmarks to your CI pipeline:

```yaml
# .github/workflows/benchmark.yml
- name: Start LocalStack
  run: docker run -d -p 4566:4566 localstack/localstack:2.3

- name: Run Benchmarks
  run: yarn benchmark
```

## Comparing Results

Save benchmark results to compare across versions:

```bash
yarn benchmark > results/v0.0.5-benchmark.txt
```

## Contributing

When adding new features, ensure benchmarks show no significant performance regression:
- Throughput should not decrease by more than 10%
- p95 latency should not increase by more than 20%
- Memory usage should remain stable
