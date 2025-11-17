import {LoggerService} from '@nestjs/common';
import pino from 'pino';
import {context, trace} from '@opentelemetry/api';

export class PinoOtelLoggerService implements LoggerService {
    private readonly logger = pino({
        level: 'debug',
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'dd/mm/yyyy, HH:MM:ss TT',
                ignore: 'pid,hostname,context',
            }
        }
    });

    private withTrace(logContext?: string) {
        const meta: Record<string, any> = {};
        
        // Add OpenTelemetry trace context
        const span = trace.getSpan(context.active());
        if (span) {
            const spanContext = span.spanContext();
            meta.traceId = spanContext.traceId;
            meta.spanId = spanContext.spanId;
        }
        
        // Add NestJS logger context (the logger name)
        if (logContext) {
            meta.context = logContext;
        }
        
        return meta;
    }

    private formatMessage(message: any, logContext?: string): string {
        const contextStr = logContext ? `[${logContext}] ` : '';
        return `${contextStr}${message}`;
    }

    log(message: any, context?: string) {
        this.logger.info(this.withTrace(context), this.formatMessage(message, context));
    }

    error(message: any, trace?: string, context?: string) {
        const meta = this.withTrace(context);
        if (trace) {
            meta.trace = trace;
        }
        this.logger.error(meta, this.formatMessage(message, context));
    }

    warn(message: any, context?: string) {
        this.logger.warn(this.withTrace(context), this.formatMessage(message, context));
    }

    debug?(message: any, context?: string) {
        this.logger.debug(this.withTrace(context), this.formatMessage(message, context));
    }

    verbose?(message: any, context?: string) {
        this.logger.trace(this.withTrace(context), this.formatMessage(message, context));
    }
}
