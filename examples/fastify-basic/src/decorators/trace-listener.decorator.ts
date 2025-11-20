import {MessageContext, QueueListener} from '@snow-tzu/fastify-sqs-listener';

/**
 * Trace Listener Decorator
 *
 * A composable decorator that adds tracing/timing information
 * to any QueueListener implementation. This demonstrates the
 * decorator pattern for cross-cutting concerns.
 */
export class TraceListenerDecorator<T> implements QueueListener<T> {
    constructor(
        private readonly wrappedListener: QueueListener<T>,
        private readonly logger: any
    ) {
    }

    async onMessage(message: T, context: MessageContext): Promise<void> {
        const startTime = Date.now();
        const traceId = this.generateTraceId();

        this.logger.info('Message processing started', {
            traceId,
            messageId: context.getMessageId()
        });

        try {
            // Call the wrapped listener
            await this.wrappedListener.onMessage(message, context);

            const duration = Date.now() - startTime;
            this.logger.info('Message processing completed', {
                traceId,
                messageId: context.getMessageId(),
                duration: `${duration}ms`,
                status: 'success'
            });
        } catch (err) {
            const error = err as Error;
            const duration = Date.now() - startTime;
            this.logger.error('Message processing failed', {
                traceId,
                messageId: context.getMessageId(),
                duration: `${duration}ms`,
                status: 'error',
                error: error.message
            });

            // Re-throw the error to maintain the original behavior
            throw error;
        }
    }

    /**
     * Generate a simple trace ID for correlation
     */
    private generateTraceId(): string {
        return `trace-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
}