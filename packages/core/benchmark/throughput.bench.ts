import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, QueueListener, SqsMessageListenerContainer} from '../src';
import {
    BenchmarkStats,
    createBenchmarkQueue,
    deleteBenchmarkQueue,
    formatDuration,
    printResults,
    sendMessages,
    waitFor,
} from './utils';

interface TestMessage {
    id: number;
    timestamp: number;
    data: string;
}

/**
 * Throughput Benchmark
 *
 * Measures messages processed per second at different concurrency levels.
 * Tests the container's ability to handle high message volumes efficiently.
 */
async function runThroughputBenchmark() {
    console.log('\n🚀 Starting Throughput Benchmark\n');
    console.log('This benchmark measures messages processed per second');
    console.log('at different concurrency levels.\n');

    const sqsClient = new SQSClient({
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
        },
    });

    const concurrencyLevels = [1, 5, 10, 20];
    const messagesPerTest = 100;
    const results: Array<{
        concurrency: number;
        throughput: number;
        duration: number;
        avgLatency: number;
    }> = [];

    for (const concurrency of concurrencyLevels) {
        console.log(`\n📊 Testing concurrency level: ${concurrency}`);
        console.log(`   Sending ${messagesPerTest} messages...`);

        const queueUrl = await createBenchmarkQueue(sqsClient, 'throughput');

        try {
            // Send messages to queue
            await sendMessages(sqsClient, queueUrl, messagesPerTest);
            console.log(`   ✓ Messages sent to queue`);

            // Setup listener
            const processedCount = {count: 0};
            const startTimes: number[] = [];
            const endTimes: number[] = [];

            const listener: QueueListener<TestMessage> = {
                onMessage: async (payload: TestMessage) => {
                    const endTime = Date.now();
                    endTimes.push(endTime);
                    startTimes.push(payload.timestamp);
                    processedCount.count++;
                },
            };

            // Configure and start container
            const container = new SqsMessageListenerContainer<TestMessage>(sqsClient);
            container.configure(options => {
                options
                    .queueName(queueUrl)
                    .pollTimeout(2)
                    .maxConcurrentMessages(concurrency)
                    .maxMessagesPerPoll(10)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
            });

            container.setId(`throughput-bench-${concurrency}`);
            container.setMessageListener(listener);

            const startTime = Date.now();
            await container.start();

            // Wait for all messages to be processed
            console.log(`   ⏳ Processing messages...`);
            await waitFor(() => processedCount.count >= messagesPerTest, 60000);

            const endTime = Date.now();
            const duration = endTime - startTime;

            await container.stop();

            // Calculate metrics
            const throughput = (messagesPerTest / duration) * 1000; // messages per second
            const latencies = endTimes.map((end, i) => end - startTimes[i]);
            const avgLatency = BenchmarkStats.mean(latencies);

            results.push({
                concurrency,
                throughput,
                duration,
                avgLatency,
            });

            console.log(`   ✓ Test complete`);
            console.log(`   ├─ Duration: ${formatDuration(duration)}`);
            console.log(`   ├─ Throughput: ${throughput.toFixed(2)} msgs/sec`);
            console.log(`   └─ Avg Latency: ${avgLatency.toFixed(2)}ms`);

        } finally {
            await deleteBenchmarkQueue(sqsClient, queueUrl);
        }
    }

    // Print summary results
    printResults('Throughput Benchmark Results', {
        'Test Configuration': `${messagesPerTest} messages per test`,
        'Concurrency Levels Tested': concurrencyLevels.join(', '),
        '': '',
    });

    results.forEach(result => {
        console.log(`Concurrency: ${result.concurrency}`);
        console.log(`  Throughput:  ${result.throughput.toFixed(2)} msgs/sec`);
        console.log(`  Duration:    ${formatDuration(result.duration)}`);
        console.log(`  Avg Latency: ${result.avgLatency.toFixed(2)}ms`);
        console.log('');
    });

    // Find best throughput
    const bestResult = results.reduce((best, current) =>
        current.throughput > best.throughput ? current : best
    );

    console.log(`🏆 Best Throughput: ${bestResult.throughput.toFixed(2)} msgs/sec`);
    console.log(`   at concurrency level ${bestResult.concurrency}\n`);

    sqsClient.destroy();
}

// Run if executed directly
if (require.main === module) {
    runThroughputBenchmark()
        .then(() => {
            console.log('✅ Throughput benchmark completed successfully\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        });
}

export {runThroughputBenchmark};
