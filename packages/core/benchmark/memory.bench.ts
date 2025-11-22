import { SQSClient } from '@aws-sdk/client-sqs';
import { SqsMessageListenerContainer } from '../src/container/sqs-message-listener-container';
import { QueueListener } from '../src/listener/queue-listener.interface';
import { MessageContext } from '../src/listener/message-context.interface';
import { AcknowledgementMode } from '../src/types/acknowledgement-mode.enum';
import {
    BenchmarkStats,
    printResults,
    sendMessages,
    createBenchmarkQueue,
    deleteBenchmarkQueue,
    waitFor,
    formatBytes,
    generateMessage,
} from './utils';

interface TestMessage {
    id: string;
    timestamp: number;
    data: string;
}

/**
 * Memory Benchmark
 * 
 * Measures memory usage under sustained load with different message sizes:
 * - Baseline memory
 * - Peak memory during processing
 * - Memory after garbage collection
 * - Memory growth rate
 */
async function runMemoryBenchmark() {
    console.log('\n💾 Starting Memory Benchmark\n');
    console.log('This benchmark measures heap memory usage during message processing');
    console.log('with different message sizes and concurrency levels.\n');

    const sqsClient = new SQSClient({
        endpoint: 'http://localhost:4566',
        region: 'us-east-1',
        credentials: {
            accessKeyId: 'test',
            secretAccessKey: 'test',
        },
    });

    const scenarios = [
        { name: 'Small Messages (100B)', size: 100, count: 200, concurrency: 10 },
        { name: 'Medium Messages (1KB)', size: 1024, count: 100, concurrency: 10 },
        { name: 'Large Messages (10KB)', size: 10240, count: 50, concurrency: 5 },
    ];

    const results: Array<{
        name: string;
        baselineMemory: number;
        peakMemory: number;
        endMemory: number;
        memoryIncrease: number;
        avgMemoryPerMessage: number;
    }> = [];

    for (const scenario of scenarios) {
        console.log(`\n📊 Testing: ${scenario.name}`);
        console.log(`   Messages: ${scenario.count}, Concurrency: ${scenario.concurrency}`);

        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        await new Promise(resolve => setTimeout(resolve, 1000));

        const baselineMemory = process.memoryUsage().heapUsed;
        console.log(`   Baseline memory: ${formatBytes(baselineMemory)}`);

        const queueUrl = await createBenchmarkQueue(sqsClient, 'memory');

        try {
            // Send messages with specific size
            console.log(`   📤 Sending ${scenario.count} messages...`);
            await sendMessages(
                sqsClient,
                queueUrl,
                scenario.count,
                () => generateMessage(scenario.size)
            );

            // Track memory during processing
            const memorySnapshots: number[] = [];
            const processedCount = { count: 0 };

            const listener: QueueListener<TestMessage> = {
                onMessage: async (payload: TestMessage) => {
                    // Simulate some processing work
                    await new Promise(resolve => setTimeout(resolve, 10));
                    processedCount.count++;
                    
                    // Take memory snapshot every 20 messages
                    if (processedCount.count % 20 === 0) {
                        memorySnapshots.push(process.memoryUsage().heapUsed);
                    }
                },
            };

            // Configure and start container
            const container = new SqsMessageListenerContainer<TestMessage>(sqsClient);
            container.configure(options => {
                options
                    .queueName(queueUrl)
                    .pollTimeout(2)
                    .maxConcurrentMessages(scenario.concurrency)
                    .maxMessagesPerPoll(10)
                    .autoStartup(false)
                    .acknowledgementMode(AcknowledgementMode.ON_SUCCESS);
            });

            container.setId(`memory-bench-${scenario.size}`);
            container.setMessageListener(listener);

            console.log(`   ⏳ Processing messages...`);
            await container.start();

            // Wait for all messages to be processed
            await waitFor(() => processedCount.count >= scenario.count, 90000);

            const peakMemory = Math.max(...memorySnapshots, process.memoryUsage().heapUsed);

            await container.stop();

            // Wait a bit and measure end memory
            await new Promise(resolve => setTimeout(resolve, 1000));
            const endMemory = process.memoryUsage().heapUsed;

            const memoryIncrease = endMemory - baselineMemory;
            const avgMemoryPerMessage = memoryIncrease / scenario.count;

            results.push({
                name: scenario.name,
                baselineMemory,
                peakMemory,
                endMemory,
                memoryIncrease,
                avgMemoryPerMessage,
            });

            console.log(`   ✓ Test complete`);
            console.log(`   ├─ Peak memory: ${formatBytes(peakMemory)}`);
            console.log(`   ├─ End memory: ${formatBytes(endMemory)}`);
            console.log(`   ├─ Memory increase: ${formatBytes(memoryIncrease)}`);
            console.log(`   └─ Avg per message: ${formatBytes(avgMemoryPerMessage)}`);

        } finally {
            await deleteBenchmarkQueue(sqsClient, queueUrl);
        }
    }

    // Print summary results
    printResults('Memory Benchmark Results', {});

    results.forEach(result => {
        console.log(result.name);
        console.log(`  Baseline Memory:      ${formatBytes(result.baselineMemory)}`);
        console.log(`  Peak Memory:          ${formatBytes(result.peakMemory)}`);
        console.log(`  End Memory:           ${formatBytes(result.endMemory)}`);
        console.log(`  Memory Increase:      ${formatBytes(result.memoryIncrease)}`);
        console.log(`  Avg per Message:      ${formatBytes(result.avgMemoryPerMessage)}`);
        console.log('');
    });

    // Memory efficiency analysis
    const avgIncrease = BenchmarkStats.mean(results.map(r => r.memoryIncrease));
    console.log(`📈 Average Memory Increase: ${formatBytes(avgIncrease)}`);
    console.log(`💡 Memory efficiency looks ${avgIncrease < 50 * 1024 * 1024 ? 'good' : 'needs optimization'}\n`);

    console.log('💡 To enable garbage collection tracking, run with: node --expose-gc\n');

    sqsClient.destroy();
}

// Run if executed directly
if (require.main === module) {
    runMemoryBenchmark()
        .then(() => {
            console.log('✅ Memory benchmark completed successfully\n');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Benchmark failed:', error);
            process.exit(1);
        });
}

export { runMemoryBenchmark };
