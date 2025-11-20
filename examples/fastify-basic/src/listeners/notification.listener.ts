import {MessageContext, QueueListener} from '@snow-tzu/sqs-listener';
import {NotificationEvent} from '../events/notification.event';
import {NotificationService} from '../services/notification.service';

/**
 * Notification Listener
 *
 * Handles notification messages from SQS.
 * Demonstrates handling different message types with the same pattern.
 */
export class NotificationListener implements QueueListener<NotificationEvent> {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly logger: any
    ) {
    }

    /**
     * Handle incoming notification messages
     */
    async onMessage(message: NotificationEvent, context: MessageContext): Promise<void> {
        this.logger.info(`Processing notification event - userId: ${message.userId}, type: ${message.type}, messageId: ${context.getMessageId()}`, {
            userId: message.userId,
            type: message.type,
            messageId: context.getMessageId()
        });

        try {
            // Process the notification through the service layer
            await this.notificationService.sendNotification(message);

            this.logger.info(`Notification sent successfully - userId: ${message.userId}, type: ${message.type}, messageId: ${context.getMessageId()}`, {
                userId: message.userId,
                type: message.type,
                messageId: context.getMessageId()
            });
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Unknown error occurred');
            this.logger.error('Failed to send notification', {
                userId: message.userId,
                type: message.type,
                messageId: context.getMessageId(),
                error: error.message
            });

            // Re-throw to let the SQS listener handle retry logic
            throw error;
        }
    }
}