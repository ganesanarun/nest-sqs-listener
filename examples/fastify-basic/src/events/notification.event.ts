import {IsIn, IsString} from 'class-validator';

/**
 * Notification Event
 *
 * Represents a notification message with validation decorators.
 * This demonstrates a simpler event structure for notifications.
 */
export class NotificationEvent {
    @IsString()
    userId!: string;

    @IsString()
    @IsIn(['email', 'sms', 'push'])
    type!: 'email' | 'sms' | 'push';

    @IsString()
    message!: string;

    @IsString()
    subject?: string;
}