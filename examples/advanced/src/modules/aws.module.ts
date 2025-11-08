import { Module, Global } from '@nestjs/common';
import { createOrderSQSClient, createNotificationSQSClient } from '../config/aws.config';
import { ORDER_SQS_CLIENT, NOTIFICATION_SQS_CLIENT } from '../tokens';

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
export class AwsModule {}
