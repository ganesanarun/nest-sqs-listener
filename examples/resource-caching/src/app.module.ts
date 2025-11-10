import { Module } from '@nestjs/common';
import { CacheDemoModule } from './modules/cache-demo.module';

@Module({
  imports: [CacheDemoModule],
})
export class AppModule {}
