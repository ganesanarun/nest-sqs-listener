import {Injectable, Logger} from '@nestjs/common';
import {NotificationEvent} from '../events/notification.event';

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    async sendNotification(notification: NotificationEvent): Promise<void> {
        this.logger.log(`Sending ${notification.type} notification to user ${notification.userId}`);
        this.logger.log(`Subject: ${notification.subject}`);
        this.logger.log(`Message: ${notification.message}`);

        // Simulate sending
        await this.delay(300);

        this.logger.log(`Notification sent successfully`);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
