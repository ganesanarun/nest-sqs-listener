export class NotificationEvent {
    userId: string;
    type: 'email' | 'sms' | 'push';
    subject: string;
    message: string;
}
