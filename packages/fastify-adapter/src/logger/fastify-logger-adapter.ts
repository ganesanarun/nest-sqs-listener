import {LoggerInterface} from '@snow-tzu/sqs-listener';
import {FastifyBaseLogger} from 'fastify';

/**
 * Adapter that wraps Fastify's pino logger to implement the core LoggerInterface.
 *
 * This adapter enables the core SQS listener to use Fastify's built-in logging system,
 * ensuring consistent logging throughout the application and leveraging pino's
 * structured logging capabilities.
 *
 * @example
 * ```typescript
 * const fastifyLogger = new FastifyLoggerAdapter(fastify.log);
 *
 * // Use with SQS container
 * const container = new SqsMessageListenerContainer(sqsClient, fastifyLogger);
 * ```
 */
export class FastifyLoggerAdapter implements LoggerInterface {
    constructor(private readonly fastifyLogger: FastifyBaseLogger) {
    }

    /**
     * Log an informational message using Fastify's pino logger.
     *
     * @param message - The message to log
     * @param context - Optional context identifier (e.g., class name, module name)
     */
    log(message: string, context?: string): void {
        if (context) {
            this.fastifyLogger.info({context}, message);
        } else {
            this.fastifyLogger.info(message);
        }
    }

    /**
     * Log an error message using Fastify's pino logger.
     *
     * @param message - The error message to log
     * @param trace - Optional stack trace or additional error details
     * @param context - Optional context identifier (e.g., class name, module name)
     */
    error(message: string, trace?: string, context?: string): void {
        const logData: any = {};

        if (context) {
            logData.context = context;
        }

        if (trace) {
            logData.trace = trace;
        }

        // Provide a meaningful message if empty
        const effectiveMessage = (!message || message.trim() === '') 
            ? 'Connection failed - check if LocalStack/AWS endpoint is running' 
            : message;

        if (Object.keys(logData).length > 0) {
            this.fastifyLogger.error(logData, effectiveMessage);
        } else {
            this.fastifyLogger.error(effectiveMessage);
        }
    }

    /**
     * Log a warning message using Fastify's pino logger.
     *
     * @param message - The warning message to log
     * @param context - Optional context identifier (e.g., class name, module name)
     */
    warn(message: string, context?: string): void {
        if (context) {
            this.fastifyLogger.warn({context}, message);
        } else {
            this.fastifyLogger.warn(message);
        }
    }

    /**
     * Log a debug message using Fastify's pino logger.
     *
     * @param message - The debug message to log
     * @param context - Optional context identifier (e.g., class name, module name)
     */
    debug(message: string, context?: string): void {
        if (context) {
            this.fastifyLogger.debug({context}, message);
        } else {
            this.fastifyLogger.debug(message);
        }
    }
}