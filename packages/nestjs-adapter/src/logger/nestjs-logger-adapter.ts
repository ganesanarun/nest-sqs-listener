import {Logger} from '@nestjs/common';
import {LoggerInterface} from '@snow-tzu/sqs-listener';

/**
 * Adapts NestJS Logger to the framework-agnostic LoggerInterface.
 *
 * This adapter allows the core package to use NestJS's logging infrastructure
 * while maintaining framework independence. All logging calls are delegated
 * to the underlying NestJS Logger instance.
 */
export class NestJSLoggerAdapter implements LoggerInterface {
    constructor(private readonly nestLogger: Logger) {
    }

    /**
     * Log an informational message using NestJS Logger.
     *
     * @param message - The message to log
     * @param context - Optional context identifier
     */
    log(message: string, context?: string): void {
        if (context !== undefined) {
            this.nestLogger.log(message, context);
        } else {
            this.nestLogger.log(message);
        }
    }

    /**
     * Log an error message using NestJS Logger.
     *
     * @param message - The error message to log
     * @param trace - Optional stack trace
     * @param context - Optional context identifier
     */
    error(message: string, trace?: string, context?: string): void {
        if (context !== undefined) {
            this.nestLogger.error(message, trace, context);
        } else if (trace !== undefined) {
            this.nestLogger.error(message, trace);
        } else {
            this.nestLogger.error(message);
        }
    }

    /**
     * Log a warning message using NestJS Logger.
     *
     * @param message - The warning message to log
     * @param context - Optional context identifier
     */
    warn(message: string, context?: string): void {
        if (context !== undefined) {
            this.nestLogger.warn(message, context);
        } else {
            this.nestLogger.warn(message);
        }
    }

    /**
     * Log a debug message using NestJS Logger.
     *
     * @param message - The debug message to log
     * @param context - Optional context identifier
     */
    debug(message: string, context?: string): void {
        if (context !== undefined) {
            this.nestLogger.debug(message, context);
        } else {
            this.nestLogger.debug(message);
        }
    }
}
