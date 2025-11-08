import {Global, Module} from '@nestjs/common';
import {createNotificationSQSClient, createOrderSQSClient} from '../config/aws.config';
import {NOTIFICATION_SQS_CLIENT, ORDER_SQS_CLIENT} from '../tokens';

@Global()
@Module({
    providers: [
        {
            provide: ORDER_SQS_CLIENT,
            useFactory: () => {
                return createOrderSQSClient();
            },
        },
        {
            provide: NOTIFICATION_SQS_CLIENT,
            useFactory: () => {
                return createNotificationSQSClient();
            },
        },
    ],
    exports: [ORDER_SQS_CLIENT, NOTIFICATION_SQS_CLIENT],
})
export class AwsModule {
}
