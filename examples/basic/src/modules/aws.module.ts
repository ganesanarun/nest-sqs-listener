import {Global, Module} from '@nestjs/common';
import {createSQSClient} from '../config/aws.config';
import {SQS_CLIENT} from '../tokens';

@Global()
@Module({
    providers: [
        {
            provide: SQS_CLIENT,
            useFactory: () => {
                return createSQSClient();
            },
        },
    ],
    exports: [SQS_CLIENT],
})
export class AwsModule {
}
