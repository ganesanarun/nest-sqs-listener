import {SQSMessageAttributes} from '../types/sqs-types';

/**
 * Context object containing message metadata, attributes, and acknowledgement methods.
 * Provides access to SQS message information and control methods for message lifecycle.
 */
export interface MessageContext {
    /**
     * Get the unique message ID assigned by SQS
     * @returns The message ID
     */
    getMessageId(): string;

    /**
     * Get the receipt handle used for message deletion
     * @returns The receipt handle
     */
    getReceiptHandle(): string;

    /**
     * Get the queue URL from which the message was received
     * @returns The queue URL
     */
    getQueueUrl(): string;

    /**
     * Get all message attributes
     * @returns Message attributes with StringValue, BinaryValue, and DataType
     */
    getMessageAttributes(): SQSMessageAttributes;

    /**
     * Get system attributes (ApproximateReceiveCount, SentTimestamp, etc.)
     * @returns System attributes as key-value pairs
     */
    getSystemAttributes(): Record<string, string>;

    /**
     * Get the approximate number of times this message has been received
     * @returns The receive count, or 0 if not available
     */
    getApproximateReceiveCount(): number;

    /**
     * Acknowledge the message by deleting it from the queue.
     * Used in MANUAL acknowledgement mode.
     * @returns Promise that resolves when the message is deleted
     */
    acknowledge(): Promise<void>;
}
