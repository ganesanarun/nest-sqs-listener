import {Module} from '@nestjs/common';
import {AwsModule} from './modules/aws.module';
import {OrderModule} from './modules/order.module';

@Module({
    imports: [
        AwsModule,
        OrderModule,
    ],
})
export class AppModule {
}
