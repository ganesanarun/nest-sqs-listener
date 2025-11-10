import { IsString, IsIn, IsNotEmpty, MaxLength } from 'class-validator';

export class NotificationEvent {
    @IsString()
    @IsNotEmpty()
    userId: string;

    @IsIn(['email', 'sms', 'push'])
    type: 'email' | 'sms' | 'push';

    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    subject: string;

    @IsString()
    @IsNotEmpty()
    message: string;
}
