import {NotificationEvent} from '../events/notification.event';

/**
 * Notification Service
 *
 * Contains business logic for sending notifications.
 * Demonstrates handling different notification types.
 */
export class NotificationService {
    constructor(private readonly logger: any) {
    }

    /**
     * Send a notification based on the event
     */
    async sendNotification(notification: NotificationEvent): Promise<void> {
        this.logger.debug('Starting notification processing', {
            userId: notification.userId,
            type: notification.type
        });

        switch (notification.type) {
            case 'email':
                await this.sendEmail(notification);
                break;
            case 'sms':
                await this.sendSms(notification);
                break;
            case 'push':
                await this.sendPushNotification(notification);
                break;
            default:
                throw new Error(`Unsupported notification type: ${notification.type}`);
        }

        this.logger.debug('Notification sent successfully', {
            userId: notification.userId,
            type: notification.type
        });
    }

    /**
     * Send email notification
     */
    private async sendEmail(notification: NotificationEvent): Promise<void> {
        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 100));

        this.logger.debug('Email sent', {
            userId: notification.userId,
            subject: notification.subject || 'Notification',
            message: notification.message.substring(0, 50) + '...'
        });
    }

    /**
     * Send SMS notification
     */
    private async sendSms(notification: NotificationEvent): Promise<void> {
        // Simulate SMS sending
        await new Promise(resolve => setTimeout(resolve, 80));

        this.logger.debug('SMS sent', {
            userId: notification.userId,
            message: notification.message.substring(0, 50) + '...'
        });
    }

    /**
     * Send push notification
     */
    private async sendPushNotification(notification: NotificationEvent): Promise<void> {
        // Simulate push notification sending
        await new Promise(resolve => setTimeout(resolve, 60));

        this.logger.debug('Push notification sent', {
            userId: notification.userId,
            message: notification.message.substring(0, 50) + '...'
        });
    }
}