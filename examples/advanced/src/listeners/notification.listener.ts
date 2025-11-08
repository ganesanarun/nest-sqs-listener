import {Injectable, Logger} from '@nestjs/common';
import {MessageContext, QueueListener} from '@snow-tzu/nestjs-sqs-listener';
import {NotificationEvent} from '../events/notification.event';
import {NotificationService} from '../services/notification.service';

@Injectable()
export class NotificationListener implements QueueListener<NotificationEvent> {
    private readonly logger = new Logger(NotificationListener.name);

    constructor(private readonly notificationService: NotificationService) {
    }

    async onMessage(message: NotificationEvent, msgContext: MessageContext): Promise<void> {
        this.logger.log(`Received notification message: ${msgContext.getMessageId()}`);

        await this.notificationService.sendNotification(message);
        await msgContext.acknowledge();
        this.logger.log(`Notification message acknowledged`);
    }
}
