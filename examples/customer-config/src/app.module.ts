import { Module } from '@nestjs/common';
import { CustomerModule } from './modules/customer.module';

@Module({
  imports: [CustomerModule],
})
export class AppModule {}
