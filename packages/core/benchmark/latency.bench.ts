import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, QueueListener, SqsMessageListenerContainer} from '../src';
import {
    BenchmarkStats,
    createBenchmarkQueue,
    deleteBenchmarkQueue,
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
 * Latency Benchmark
 *
 * Measures end-to-end message processing latency including:
 * - Time from message send to processing start
 * - Percentile distribution (p50, p95, p99)
 * - Min/Max latencies
 */
async function runLatencyBenchmark() {
    console.log('\n⏱️  Starting Latency Benchmark\n');
    console.log('This benchmark measures end-to-end message processing latency');
    console.log('from message send to processing completion.\n');

    const sqsClient = new SQSClient({
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
        },
    });

    const messageCount = 200;
    const concurrency = 10;

    console.log(`📊 Configuration:`);
    console.log(`   Messages: ${messageCount}`);
    console.log(`   Concurrency: ${concurrency}\n`);

    const queueUrl = await createBenchmarkQueue(sqsClient, 'latency');

    try {
        console.log(`📤 Sending ${messageCount} messages to queue...`);
        await sendMessages(sqsClient, queueUrl, messageCount);
        console.log(`   ✓ Messages sent\n`);

        // Setup listener to track latencies
        const latencies: number[] = [];
        const processedCount = {count: 0};

        const listener: QueueListener<TestMessage> = {
            onMessage: async (payload: TestMessage) => {
                const endTime = Date.now();
                const latency = endTime - payload.timestamp;
                latencies.push(latency);
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

        container.setId('latency-bench');
        container.setMessageListener(listener);

        console.log('🚀 Starting container and processing messages...\n');
        await container.start();

        // Wait for all messages to be processed
        await waitFor(() => processedCount.count >= messageCount, 60000);

        await container.stop();

        // Calculate statistics
        const results = {
            'Total Messages': messageCount,
            'Messages Processed': latencies.length,
            '': '',
            'Mean Latency': `${BenchmarkStats.mean(latencies).toFixed(2)}ms`,
            'Median Latency (p50)': `${BenchmarkStats.median(latencies).toFixed(2)}ms`,
            'p95 Latency': `${BenchmarkStats.percentile(latencies, 95).toFixed(2)}ms`,
            'p99 Latency': `${BenchmarkStats.percentile(latencies, 99).toFixed(2)}ms`,
            'Min Latency': `${BenchmarkStats.min(latencies).toFixed(2)}ms`,
            'Max Latency': `${BenchmarkStats.max(latencies).toFixed(2)}ms`,
            'Standard Deviation': `${BenchmarkStats.stdDev(latencies).toFixed(2)}ms`,
        };

        printResults('Latency Benchmark Results', results);

        // Print distribution
        console.log('Latency Distribution:');
        const percentiles = [10, 25, 50, 75, 90, 95, 99];
        percentiles.forEach(p => {
            const value = BenchmarkStats.percentile(latencies, p);
            const bar = '█'.repeat(Math.floor(value / 10));
            console.log(`  p${p.toString().padEnd(3)}: ${value.toFixed(2).padStart(8)}ms ${bar}`);
        });
        console.log('');

    } finally {
        await deleteBenchmarkQueue(sqsClient, queueUrl);
    }

    sqsClient.destroy();
}

// Run if executed directly
if (require.main === module) {
    runLatencyBenchmark()
        .then(() => {
            console.log('✅ Latency benchmark completed successfully\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        });
}

export {runLatencyBenchmark};
