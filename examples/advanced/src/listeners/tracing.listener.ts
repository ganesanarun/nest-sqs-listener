import {MessageContext, QueueListener, SQSMessageAttributes} from '@snow-tzu/nestjs-sqs-listener';
import {context as otContext, propagation, SpanStatusCode, trace} from "@opentelemetry/api";
import {W3CTraceContextPropagator} from '@opentelemetry/core';
import {Logger} from "@nestjs/common";

propagation.setGlobalPropagator(new W3CTraceContextPropagator());

const getter = {
    keys: (carrier: Record<string, string>): string[] => Object.keys(carrier),
    get: (carrier: Record<string, string>, key: string): string => carrier[key],
};

export type MessageAttributes = Record<string, string>;

function toAttrRecord(
    attrs?: SQSMessageAttributes,
): MessageAttributes {
    const out: Record<string, string> = {};
    if (!attrs) {
        return out;
    }
    for (const [k, v] of Object.entries(attrs)) {
        const s =
            v?.StringValue ??
            (v?.BinaryValue
                ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
                Buffer.from(v.BinaryValue as any).toString('utf8')
                : undefined);
        if (s !== undefined) {
            out[k] = String(s);
        }
    }
    return out;
}

export class TracingListener<T> implements QueueListener<T> {
    private readonly logger = new Logger('TracingListener');

    constructor(private readonly listener: QueueListener<T>) {
    }

    async onMessage(payload: T, context: MessageContext): Promise<void> {
        const tracer = trace.getTracer('sqs-listener');
        const attributes = toAttrRecord(context.getMessageAttributes());
        let ctx = otContext.active();
        const traceParent = attributes.traceparent;
        if (traceParent) {
            this.logger.debug(`TraceParent found: ${traceParent}`);
            ctx = propagation.extract(ctx, attributes, getter);
        }
        const span = tracer.startSpan('sqs.consume', undefined, ctx);
        // Log OpenTelemetry tracing context
        try {
            this.logger.log(`TracingListener: Received message with ID ${context.getMessageId()}`);
            await otContext.with(trace.setSpan(ctx, span), async () => {
                await this.listener.onMessage(payload, context);
            });
        } catch (error) {
            span.recordException(error as Error);
            span.setStatus({code: SpanStatusCode.ERROR});
            this.logger.error(`TracingListener: Error processing message with ID ${context.getMessageId()}:`, error);
            throw error;
        } finally {
            span.end();
        }
    }

}
