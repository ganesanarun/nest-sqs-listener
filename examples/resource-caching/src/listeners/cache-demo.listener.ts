import { Injectable, Logger } from '@nestjs/common';
import { QueueListener, MessageContext } from '@snow-tzu/nest-sqs-listener';
import { CacheDemoEvent } from '../events/cache-demo.event';
import { CacheContext } from '../interfaces/cache-context.interface';
import { CacheResources } from '../interfaces/cache-resources.interface';

@Injectable()
export class CacheDemoListener
  implements QueueListener<CacheDemoEvent, CacheContext, CacheResources>
{
  private readonly logger = new Logger(CacheDemoListener.name);

  async onMessage(
    payload: CacheDemoEvent,
    context: MessageContext<CacheContext, CacheResources>,
  ): Promise<void> {
    const cacheContext = context.getContext()!;
    const { resource } = context.getResources()!;

    this.logger.log(
      `Processing message ${payload.id} for ${cacheContext.tenantId}:${cacheContext.environment}`,
    );

    // Use the cached resource
    await resource.use();

    // Log resource statistics
    const stats = resource.getStats();
    this.logger.log(
      `Message processed using resource (usage count: ${stats.usageCount}, age: ${Math.round(stats.ageMs / 1000)}s)`,
    );
  }
}
