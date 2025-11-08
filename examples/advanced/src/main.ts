import {NestFactory} from '@nestjs/core';
import {AppModule} from './app.module';
import * as dotenv from 'dotenv';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { defaultResource, resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { propagation } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { PinoOtelLoggerService } from './pino-otel-logger.service';

// Load environment variables from .env file
dotenv.config();

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const globalLogger = new PinoOtelLoggerService();
    app.useLogger(globalLogger);

    globalLogger.log('Starting SQS Listener Test Application...');
    globalLogger.log(`Order AWS Endpoint: ${process.env.ORDER_AWS_ENDPOINT || 'default'}`);
    globalLogger.log(`Order AWS Region: ${process.env.ORDER_AWS_REGION || 'default'}`);
    globalLogger.log(`Notification AWS Endpoint: ${process.env.NOTIFICATION_AWS_ENDPOINT || 'default'}`);
    globalLogger.log(`Notification AWS Region: ${process.env.NOTIFICATION_AWS_REGION || 'default'}`);

    await app.init();

    globalLogger.log('Application initialized successfully');
    globalLogger.log('SQS listeners are now active and polling for messages');
    globalLogger.log('Press Ctrl+C to stop');

    // Keep the application running
    process.on('SIGINT', async () => {
        globalLogger.log('Received SIGINT, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        globalLogger.log('Received SIGTERM, shutting down gracefully...');
        await app.close();
        process.exit(0);
    });
}

// Initialize OpenTelemetry Tracer Provider
const serviceResource = resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'nest-sqs-listener-app',
});
const provider = new NodeTracerProvider({
    resource: defaultResource().merge(serviceResource),
});
provider.register();

// Set global propagator
propagation.setGlobalPropagator(new W3CTraceContextPropagator());

registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [], // Add more instrumentations if needed
});

bootstrap().catch(err => {
    const logger = new PinoOtelLoggerService();
    logger.error('Failed to start application:', { error: err });
    process.exit(1);
});
