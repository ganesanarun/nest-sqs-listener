import {SQSClient} from '@aws-sdk/client-sqs';
import {
    AcknowledgementMode,
    ConsoleLogger,
    JsonPayloadMessagingConverter,
    SqsMessageListenerContainer,
    ValidationFailureMode,
} from '@snow-tzu/sqs-listener';
import {OrderCreatedEvent} from './events/order-created.event';
import {OrderListener} from './listeners/order-listener';

/**
 * SQS Manager class to handle the SQS listener lifecycle
 * Integrates with Express application lifecycle
 */
export class SqsManager {
    private containers: SqsMessageListenerContainer<any>[] = [];
    private readonly logger = new ConsoleLogger('SqsManager');

    constructor(private readonly sqsClient: SQSClient) {
    }

    /**
     * Initialize all SQS listeners
     */
    async initialize(): Promise<void> {
        this.logger.log('Initializing SQS listeners...');

        // Create order queue listener
        const orderContainer = this.createOrderListener();
        this.containers.push(orderContainer);

        this.logger.log(`Initialized ${this.containers.length} SQS listener(s)`);
    }

    /**
     * Start all SQS listeners
     */
    async start(): Promise<void> {
        this.logger.log('Starting SQS listeners...');

        for (const container of this.containers) {
            await container.start();
        }

        this.logger.log('All SQS listeners started successfully');
    }

    /**
     * Stop all SQS listeners (graceful shutdown)
     */
    async stop(): Promise<void> {
        this.logger.log('Stopping SQS listeners...');

        const stopPromises = this.containers.map(container => container.stop());
        await Promise.all(stopPromises);

        this.logger.log('All SQS listeners stopped successfully');
    }

    /**
     * Create and configure the order listener
     */
    private createOrderListener(): SqsMessageListenerContainer<OrderCreatedEvent> {
        const container = new SqsMessageListenerContainer<OrderCreatedEvent>(
            this.sqsClient,
            new ConsoleLogger('OrderContainer')
        );

        const converter = new JsonPayloadMessagingConverter(OrderCreatedEvent, {
            validationFailureMode: ValidationFailureMode.ACKNOWLEDGE,
        });
        container.configure(options => {
            options
                .queueName(process.env.ORDER_QUEUE_NAME || 'order-created-queue')
                .acknowledgementMode(AcknowledgementMode.ON_SUCCESS)
                .maxConcurrentMessages(5)
                .visibilityTimeout(30)
                .messageConverter(converter)
                .autoStartup(false);
        });


        const listener = new OrderListener();
        container.setMessageListener(listener);

        return container;
    }
}
