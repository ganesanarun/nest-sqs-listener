import { LoggerService } from '@nestjs/common';
import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

export class PinoOtelLoggerService implements LoggerService {
    private readonly logger = pino({ level: 'debug', transport: { target: 'pino-pretty' } });

    private withTrace(meta: Record<string, any> = {}) {
        const span = trace.getSpan(context.active());
        if (span) {
            const spanContext = span.spanContext();
            meta = {
                ...meta,
                traceId: spanContext.traceId,
                spanId: spanContext.spanId,
            };
        }
        return meta;
    }

    log(message: any, ...optionalParams: any[]) {
        this.logger.info(this.withTrace(), message, ...optionalParams);
    }
    error(message: any, ...optionalParams: any[]) {
        this.logger.error(this.withTrace(), message, ...optionalParams);
    }
    warn(message: any, ...optionalParams: any[]) {
        this.logger.warn(this.withTrace(), message, ...optionalParams);
    }
    debug?(message: any, ...optionalParams: any[]) {
        this.logger.debug(this.withTrace(), message, ...optionalParams);
    }
    verbose?(message: any, ...optionalParams: any[]) {
        this.logger.info(this.withTrace(), message, ...optionalParams);
    }
}
