import { Logger } from '@nestjs/common';
import { CacheContext } from '../interfaces/cache-context.interface';

/**
 * A managed resource that demonstrates proper lifecycle management.
 * Tracks creation time, usage, and implements cleanup.
 */
export class ManagedResource {
  private readonly logger = new Logger(ManagedResource.name);
  private readonly createdAt: Date;
  private usageCount = 0;

  constructor(private readonly context: CacheContext) {
    this.createdAt = new Date();
    this.logger.log(
      `Creating new resource for ${context.tenantId}:${context.environment}`,
    );
  }

  /**
   * Get the cache key for this resource
   */
  getCacheKey(): string {
    return `${this.context.tenantId}:${this.context.environment}`;
  }

  /**
   * Use the resource (simulates actual work)
   */
  async use(): Promise<void> {
    this.usageCount++;
    this.logger.debug(
      `Using resource ${this.getCacheKey()} (usage count: ${this.usageCount})`,
    );
    // Simulate work
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  /**
   * Get resource statistics
   */
  getStats() {
    return {
      cacheKey: this.getCacheKey(),
      createdAt: this.createdAt,
      usageCount: this.usageCount,
      ageMs: Date.now() - this.createdAt.getTime(),
    };
  }

  /**
   * Cleanup the resource
   */
  async cleanup(): Promise<void> {
    const stats = this.getStats();
    this.logger.log(
      `Cleaning up resource ${stats.cacheKey} (used ${stats.usageCount} times, age: ${Math.round(stats.ageMs / 1000)}s)`,
    );
    // Simulate cleanup work
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.logger.log(`Resource ${stats.cacheKey} cleaned up successfully`);
  }
}
