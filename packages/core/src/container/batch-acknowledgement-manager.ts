import { DeleteMessageBatchCommand, SQSClient } from '@aws-sdk/client-sqs';
import { LoggerInterface } from '../logger/logger.interface';

interface PendingAcknowledgement {
    id: string;
    receiptHandle: string;
    queueUrl: string;
}

/**
 * Manages batch acknowledgements of SQS messages.
 * 
 * Batches delete operations to reduce API calls by up to 10x.
 * AWS SQS allows batch delete of up to 10 messages per request.
 */
export interface BatchAckOptions {
    batchSize?: number; // default 10
    flushIntervalMs?: number; // default 100ms
}

export class BatchAcknowledgementManager {
    private pendingByQueue: Map<string, PendingAcknowledgement[]> = new Map();
    private flushTimer?: NodeJS.Timeout;
    private readonly batchSize: number;
    private readonly flushIntervalMs: number; // Flush interval for partial batches

    constructor(
        private readonly sqsClient: SQSClient,
        private readonly logger: LoggerInterface,
        options?: BatchAckOptions
    ) {
        this.batchSize = Math.max(1, Math.min(10, options?.batchSize ?? 10));
        this.flushIntervalMs = Math.max(0, options?.flushIntervalMs ?? 100);
    }

    /**
     * Queue a message for batch acknowledgement.
     * Automatically flushes when batch size is reached.
     */
    async acknowledge(messageId: string, receiptHandle: string, queueUrl: string): Promise<void> {
        // Get or create a pending array for this queue
        let pending = this.pendingByQueue.get(queueUrl);
        if (!pending) {
            pending = [];
            this.pendingByQueue.set(queueUrl, pending);
        }

        // Add to pending
        pending.push({
            id: messageId,
            receiptHandle,
            queueUrl,
        });

        this.logger.debug(`Queued message ${messageId} for batch acknowledgement (${pending.length}/${this.batchSize})`);

        // Flush if the batch is full
        if (pending.length >= this.batchSize) {
            await this.flushQueue(queueUrl);
        } else {
            // Schedule a flush if not already scheduled
            this.scheduleFlush();
        }
    }

    /**
     * Flush all pending acknowledgements for a specific queue.
     */
    private async flushQueue(queueUrl: string): Promise<void> {
        const pending = this.pendingByQueue.get(queueUrl);
        if (!pending || pending.length === 0) {
            return;
        }

        // Take up to batchSize messages
        const batch = pending.splice(0, this.batchSize);

        try {
            const command = new DeleteMessageBatchCommand({
                QueueUrl: queueUrl,
                Entries: batch.map(msg => ({
                    Id: msg.id,
                    ReceiptHandle: msg.receiptHandle,
                })),
            });

            this.logger.debug(`Batch acknowledging ${batch.length} messages from queue ${queueUrl}`);
            const result = await this.sqsClient.send(command);

            // Log any failures
            if (result.Failed && result.Failed.length > 0) {
                result.Failed.forEach(failure => {
                    this.logger.error(
                        `Failed to acknowledge message ${failure.Id}: ${failure.Message}`,
                        failure.Code
                    );
                });
            }

            // Clean up if the queue is now empty
            if (pending.length === 0) {
                this.pendingByQueue.delete(queueUrl);
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(
                `Failed to batch acknowledge messages: ${errorMessage}`,
                error instanceof Error ? error.stack : undefined
            );

            // Put messages back in the queue for retry
            pending.unshift(...batch);
        }
    }

    /**
     * Schedule a flush of all queues after a short delay.
     * This ensures messages don't wait too long if batch size isn't reached.
     */
    private scheduleFlush(): void {
        if (this.flushTimer) {
            return; // Already scheduled
        }

        this.flushTimer = setTimeout(() => {
            this.flushTimer = undefined;
            this.flushAll().catch(error => {
                this.logger.error('Error during scheduled flush:', error);
            });
        }, this.flushIntervalMs);
    }

    /**
     * Flush all pending acknowledgements across all queues.
     * Called during shutdown or by timer.
     */
    async flushAll(): Promise<void> {
        const queueUrls = Array.from(this.pendingByQueue.keys());
        
        for (const queueUrl of queueUrls) {
            const pending = this.pendingByQueue.get(queueUrl);
            
            // Flush in batches
            while (pending && pending.length > 0) {
                await this.flushQueue(queueUrl);
            }
        }

        // Clear the timer
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = undefined;
        }
    }

    /**
     * Get the number of pending acknowledgements across all queues.
     */
    getPendingCount(): number {
        let count = 0;
        for (const pending of this.pendingByQueue.values()) {
            count += pending.length;
        }
        return count;
    }

    /**
     * Clean up resources.
     */
    async shutdown(): Promise<void> {
        // Flush all pending acknowledgements
        await this.flushAll();
        
        // Clear any remaining state
        this.pendingByQueue.clear();
    }
}
