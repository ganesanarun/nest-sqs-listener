import {Module} from '@nestjs/common';
import {AwsModule} from './modules/aws.module';
import {OrderModule} from './modules/order.module';
import {NotificationModule} from './modules/notification.module';

@Module({
    imports: [
        AwsModule,
        OrderModule,
        NotificationModule,
    ],
})
export class AppModule {
}
