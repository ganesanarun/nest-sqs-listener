import { runThroughputBenchmark } from './throughput.bench';
import { runLatencyBenchmark } from './latency.bench';
import { runMemoryBenchmark } from './memory.bench';

/**
 * Run all benchmarks in sequence
 */
async function runAllBenchmarks() {
    console.log('\n' + '='.repeat(80));
    console.log('  @snow-tzu/sqs-listener - Performance Benchmark Suite');
    console.log('='.repeat(80));
    console.log('\nThis suite measures the performance characteristics of the SQS listener');
    console.log('including throughput, latency, and memory usage.\n');
    console.log('Prerequisites:');
    console.log('  - LocalStack running on localhost:4566');
    console.log('  - Command: docker run --rm -d -p 4566:4566 localstack/localstack:2.3\n');
    console.log('='.repeat(80));

    const startTime = Date.now();

    try {
        // Run throughput benchmark
        await runThroughputBenchmark();
        console.log('\n' + '-'.repeat(80) + '\n');

        // Run latency benchmark
        await runLatencyBenchmark();
        console.log('\n' + '-'.repeat(80) + '\n');

        // Run memory benchmark
        await runMemoryBenchmark();
        console.log('\n' + '-'.repeat(80) + '\n');

        const duration = Date.now() - startTime;
        const durationSec = (duration / 1000).toFixed(2);

        console.log('\n' + '='.repeat(80));
        console.log('  Benchmark Suite Complete');
        console.log('='.repeat(80));
        console.log(`\n  Total Duration: ${durationSec}s`);
        console.log(`\n  All benchmarks completed successfully! 🎉\n`);
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\n❌ Benchmark suite failed:', error);
        process.exit(1);
    }
}

// Run all benchmarks
runAllBenchmarks()
    .then(() => process.exit(0))
    .catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
