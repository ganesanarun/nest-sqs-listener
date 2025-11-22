import {Module} from '@nestjs/common';
import {createSQSClient} from '../config/aws.config';

export const SQS_CLIENT = Symbol('SQS_CLIENT');

/**
 * AWS module that provides the SQS client for the batch acknowledgement example.
 *
 * This module configures the SQS client to work with both LocalStack (local testing)
 * and AWS (production) environments.
 */
@Module({
    providers: [
        {
            provide: SQS_CLIENT,
            useFactory: () => createSQSClient(),
        },
    ],
    exports: [SQS_CLIENT],
})
export class AwsModule {
}