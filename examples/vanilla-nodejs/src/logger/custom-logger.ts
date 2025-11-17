import {LoggerInterface} from '@snow-tzu/sqs-listener';

/**
 * Custom logger implementation demonstrating how to integrate
 * your own logging solution with the framework-agnostic core package.
 *
 * This example uses simple console logging with timestamps and colors,
 * but you could integrate any logging library (Winston, Pino, Bunyan, etc.)
 */
export class CustomLogger implements LoggerInterface {
    private readonly context: string;

    constructor(context?: string) {
        this.context = context || 'App';
    }

    log(message: string, context?: string): void {
        const ctx = context || this.context;
        const timestamp = new Date().toISOString();
        console.log(`\x1b[32m[${timestamp}] [${ctx}] INFO:\x1b[0m ${message}`);
    }

    error(message: string, trace?: string, context?: string): void {
        const ctx = context || this.context;
        const timestamp = new Date().toISOString();
        console.error(`\x1b[31m[${timestamp}] [${ctx}] ERROR:\x1b[0m ${message}`);
        if (trace) {
            console.error(`\x1b[31mStack trace:\x1b[0m\n${trace}`);
        }
    }

    warn(message: string, context?: string): void {
        const ctx = context || this.context;
        const timestamp = new Date().toISOString();
        console.warn(`\x1b[33m[${timestamp}] [${ctx}] WARN:\x1b[0m ${message}`);
    }

    debug(message: string, context?: string): void {
        const ctx = context || this.context;
        const timestamp = new Date().toISOString();
        console.debug(`\x1b[36m[${timestamp}] [${ctx}] DEBUG:\x1b[0m ${message}`);
    }
}
