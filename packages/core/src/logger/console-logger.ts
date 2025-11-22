import {LoggerInterface} from './logger.interface';

/**
 * Default console-based logger implementation.
 *
 * This logger uses the standard console methods to output log messages.
 * It serves as the default logger when no custom logger is provided.
 */
export class ConsoleLogger implements LoggerInterface {
    /**
     * Creates a new ConsoleLogger instance.
     *
     * @param context - Optional default context identifier that will be used
     *                  for all log messages unless overridden
     */
    constructor(private readonly context?: string) {
    }

    /**
     * Log an informational message to the console.
     *
     * @param message - The message to log
     * @param context - Optional context identifier, overrides the default context
     */
    log(message: string, context?: string): void {
        const ctx = context || this.context;
        console.log(`[${ctx || 'SQS'}] ${message}`);
    }

    /**
     * Log an error message to the console.
     *
     * @param message - The error message to log
     * @param trace - Optional stack trace or additional error details
     * @param context - Optional context identifier, overrides the default context
     */
    error(message: string, trace?: string, context?: string): void {
        const ctx = context || this.context;
        console.error(`[${ctx || 'SQS'}] ${message}`);
        if (trace) {
            console.error(trace);
        }
    }

    /**
     * Log a warning message to the console.
     *
     * @param message - The warning message to log
     * @param context - Optional context identifier, overrides the default context
     */
    warn(message: string, context?: string): void {
        const ctx = context || this.context;
        console.warn(`[${ctx || 'SQS'}] ${message}`);
    }

    /**
     * Log a debug message to the console.
     *
     * @param message - The debug message to log
     * @param context - Optional context identifier, overrides the default context
     */
    debug(message: string, context?: string): void {
        const ctx = context || this.context;
        console.debug(`[${ctx || 'SQS'}] ${message}`);
    }
}
