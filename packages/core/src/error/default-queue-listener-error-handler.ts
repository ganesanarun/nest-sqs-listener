import {LoggerInterface} from '../logger/logger.interface';
import {QueueListenerErrorHandler} from './queue-listener-error-handler.interface';
import {MessageContext} from '../listener/message-context.interface';
import {MessageValidationError} from '../converter/message-validation-error';

/**
 * Default implementation of QueueListenerErrorHandler that logs errors
 * and allows messages to retry by not acknowledging them.
 *
 * This handler:
 * - Logs error details with message ID, error message, and stack trace
 * - Provides detailed validation error information for MessageValidationError
 * - Does NOT acknowledge messages by default (allows retry)
 * - Can be extended or replaced with custom error handling logic
 */
export class DefaultQueueListenerErrorHandler implements QueueListenerErrorHandler {
    constructor(private readonly logger: LoggerInterface) {
    }

    /**
     * Handle an error by logging it and allowing the message to retry.
     * The message will not be acknowledged, so it will return to the queue
     * after the visibility timeout expires.
     *
     * For validation errors, provides detailed constraint information.
     *
     * @param error - The error that occurred
     * @param message - The message payload that was being processed
     * @param context - The message context containing metadata
     */
    async handleError(
        error: Error,
        message: any,
        context: MessageContext
    ): Promise<void> {
        const messageId = context.getMessageId();
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        // Special handling for validation errors to show detailed constraint information
        if (error instanceof MessageValidationError) {
            const formattedErrors = error.getFormattedErrors();
            this.logger.error(
                `Error processing message ${messageId}: ${errorMessage}\nValidation errors:\n${formattedErrors}`,
                errorStack
            );
        } else {
            this.logger.error(
                `Error processing message ${messageId}: ${errorMessage}`,
                errorStack
            );
        }

        // Don't acknowledge by default - let the message retry
        // Custom error handlers can override this behavior by calling context.acknowledge()
    }
}
