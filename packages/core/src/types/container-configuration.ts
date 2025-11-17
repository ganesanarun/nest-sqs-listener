import {AcknowledgementMode} from './acknowledgement-mode.enum';

/**
 * Configuration interface for SqsMessageListenerContainer
 * Defines all container configuration options including queue settings,
 * polling behavior, concurrency limits, and acknowledgement mode
 */
export interface ContainerConfiguration {
    /**
     * Container identifier for logging and monitoring
     */
    id: string;

    /**
     * Queue name (will be resolved to URL) or full queue URL
     */
    queueName: string;

    /**
     * Resolved queue URL (populated after resolution)
     */
    queueUrl?: string;

    /**
     * Long polling timeout in seconds (default: 20)
     * Maximum time to wait for messages when polling
     */
    pollTimeout: number;

    /**
     * Visibility timeout in seconds (default: 30)
     * Duration that messages are hidden from other consumers after being received
     */
    visibilityTimeout: number;

    /**
     * Maximum number of messages to process concurrently (default: 10)
     */
    maxConcurrentMessages: number;

    /**
     * Maximum number of messages to receive per poll (default: 10)
     * AWS SQS maximum is 10
     */
    maxMessagesPerPoll: number;

    /**
     * Whether to start polling automatically when the module initializes (default: true)
     */
    autoStartup: boolean;

    /**
     * Acknowledgement mode determining when messages are deleted from the queue
     * - ON_SUCCESS: Delete only on successful processing
     * - MANUAL: Never auto-delete, requires explicit acknowledge() call
     * - ALWAYS: Always delete it regardless of processing outcome
     */
    acknowledgementMode: AcknowledgementMode;

    /**
     * Polling error backoff delay in seconds (default: 5)
     * Duration to wait before retrying after a polling error
     */
    pollingErrorBackoff: number;
}
