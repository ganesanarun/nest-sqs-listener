import {MessageContext} from '../listener/message-context.interface';

/**
 * Interface for handling errors that occur during message processing.
 * Implementations can define custom error handling logic such as:
 * - Logging errors
 * - Sending messages to dead-letter queues
 * - Deciding whether to acknowledge or retry messages
 * - Implementing retry strategies based on error types
 */
export interface QueueListenerErrorHandler {
    /**
     * Handle an error that occurred during message processing.
     *
     * @param error - The error that occurred
     * @param message - The message payload that was being processed
     * @param context - The message context containing metadata and control methods
     * @returns Promise that resolves when error handling is complete
     */
    handleError(
        error: Error,
        message: any,
        context: MessageContext
    ): Promise<void>;
}
