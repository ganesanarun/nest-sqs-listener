import {Module} from '@nestjs/common';
import {AwsModule} from './modules/aws.module';
import {OrderBatchModule} from './modules/order-batch.module';

/**
 * Root application module for the NestJS Batch Acknowledgement example.
 *
 * This module demonstrates basic batch acknowledgement functionality by:
 * - Importing AWS configuration for SQS client
 * - Setting up a single queue listener with batch acknowledgements enabled
 * - Using default batch settings (maxSize=10, flushInterval=100ms)
 */
@Module({
    imports: [
        AwsModule,
        OrderBatchModule,
    ],
})
export class AppModule {
}