import { SQSClient, SendMessageCommand, CreateQueueCommand, DeleteQueueCommand } from '@aws-sdk/client-sqs';

/**
 * Statistics utilities for benchmark measurements
 */
export class BenchmarkStats {
    static mean(values: number[]): number {
        return values.reduce((a, b) => a + b, 0) / values.length;
    }

    static median(values: number[]): number {
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 0
            ? (sorted[mid - 1] + sorted[mid]) / 2
            : sorted[mid];
    }

    static percentile(values: number[], p: number): number {
        const sorted = [...values].sort((a, b) => a - b);
        const index = Math.ceil((p / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }

    static min(values: number[]): number {
        return Math.min(...values);
    }

    static max(values: number[]): number {
        return Math.max(...values);
    }

    static stdDev(values: number[]): number {
        const avg = this.mean(values);
        const squareDiffs = values.map(value => Math.pow(value - avg, 2));
        const avgSquareDiff = this.mean(squareDiffs);
        return Math.sqrt(avgSquareDiff);
    }
}

/**
 * Format bytes to human readable string
 */
export function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(2)}s`;
    return `${(ms / 60000).toFixed(2)}min`;
}

/**
 * Print benchmark results in a formatted table
 */
export function printResults(title: string, results: Record<string, any>): void {
    console.log('\n' + '='.repeat(80));
    console.log(`  ${title}`);
    console.log('='.repeat(80));
    
    Object.entries(results).forEach(([key, value]) => {
        const formattedKey = key.padEnd(30, ' ');
        console.log(`  ${formattedKey}: ${value}`);
    });
    
    console.log('='.repeat(80) + '\n');
}

/**
 * Helper to send batch of messages to SQS queue
 */
export async function sendMessages(
    sqsClient: SQSClient,
    queueUrl: string,
    count: number,
    messageGenerator?: (index: number) => any
): Promise<void> {
    const defaultGenerator = (i: number) => ({
        id: i,
        timestamp: Date.now(),
        data: `Test message ${i}`,
    });

    const generator = messageGenerator || defaultGenerator;

    // Send messages in parallel batches of 10 (SQS batch limit)
    const batchSize = 10;
    for (let i = 0; i < count; i += batchSize) {
        const batch = Math.min(batchSize, count - i);
        const promises = [];
        
        for (let j = 0; j < batch; j++) {
            const messageBody = generator(i + j);
            promises.push(
                sqsClient.send(
                    new SendMessageCommand({
                        QueueUrl: queueUrl,
                        MessageBody: JSON.stringify(messageBody),
                    })
                )
            );
        }
        
        await Promise.all(promises);
    }
}

/**
 * Create a test queue for benchmarking
 */
export async function createBenchmarkQueue(
    sqsClient: SQSClient,
    prefix: string = 'benchmark'
): Promise<string> {
    const queueName = `${prefix}-queue-${Date.now()}`;
    const response = await sqsClient.send(
        new CreateQueueCommand({
            QueueName: queueName,
        })
    );
    return response.QueueUrl!;
}

/**
 * Delete a test queue
 */
export async function deleteBenchmarkQueue(
    sqsClient: SQSClient,
    queueUrl: string
): Promise<void> {
    try {
        await sqsClient.send(
            new DeleteQueueCommand({
                QueueUrl: queueUrl,
            })
        );
    } catch (error) {
        console.warn('Failed to delete queue:', error);
    }
}

/**
 * Wait for a condition with timeout
 */
export async function waitFor(
    condition: () => boolean,
    timeoutMs: number = 30000,
    checkIntervalMs: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (!condition()) {
        if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Timeout waiting for condition after ${timeoutMs}ms`);
        }
        await new Promise(resolve => setTimeout(resolve, checkIntervalMs));
    }
}

/**
 * Generate test message of specified size
 */
export function generateMessage(sizeInBytes: number): any {
    const overhead = 50; // Approximate JSON overhead
    const dataSize = Math.max(0, sizeInBytes - overhead);
    const data = 'x'.repeat(dataSize);
    
    return {
        id: Math.random().toString(36).substring(7),
        timestamp: Date.now(),
        data,
    };
}
