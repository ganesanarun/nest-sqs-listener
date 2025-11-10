import { Module } from '@nestjs/common';
import { EventModule } from './modules/event.module';

@Module({
  imports: [EventModule],
})
export class AppModule {}
