import {Logger, Module} from '@nestjs/common';
import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, SqsMessageListenerContainer, ValidationFailureMode} from '@snow-tzu/nest-sqs-listener';
import {NotificationService} from '../services/notification.service';
import {NotificationListener} from '../listeners/notification.listener';
import {TracingListener} from '../listeners/tracing.listener';
import {NotificationEvent} from '../events/notification.event';
import {NOTIFICATION_CONTAINER, NOTIFICATION_SQS_CLIENT} from '../tokens';


@Module({
    providers: [
        NotificationService,
        NotificationListener,
        {
            provide: NOTIFICATION_CONTAINER,
            useFactory: (
                listener: NotificationListener,
                sqsClient: SQSClient,
            ) => {
                const logger = new Logger('NotificationContainer');
                logger.log('Creating Notification Container');

                const container = new SqsMessageListenerContainer<NotificationEvent>(sqsClient);

                container.configure(options => {
                    options
                        .queueName(process.env.NOTIFICATION_QUEUE_NAME || 'notification-events')
                        .pollTimeout(20)
                        .autoStartup(true)
                        .acknowledgementMode(AcknowledgementMode.MANUAL) // Manual acknowledgement
                        .maxConcurrentMessages(3)
                        .visibilityTimeout(30)
                        .maxMessagesPerPoll(5)
                        // Enable validation with ACKNOWLEDGE mode - invalid messages are logged and removed
                        .targetClass(NotificationEvent)
                        .enableValidation(true)
                        .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE)
                        .validatorOptions({
                            whitelist: true,
                        });
                });

                container.setId('notificationListener');
                container.setMessageListener(new TracingListener(listener));

                logger.log('Notification Container configured successfully');
                return container;
            },
            inject: [NotificationListener, NOTIFICATION_SQS_CLIENT],
        },
    ],
    exports: [NOTIFICATION_CONTAINER],
})
export class NotificationModule {
}
