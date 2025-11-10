# Resource Caching and Cleanup Example

This example demonstrates advanced resource caching patterns and proper cleanup strategies for context-based resources.

## Overview

This example focuses on:
- Custom cache key generation for optimal performance
- Resource lifecycle management
- Proper cleanup on shutdown
- Cache hit/miss logging and monitoring
- Multiple context dimensions (tenant + environment)

## What You'll Learn

- How to implement custom cache key generators
- How to manage resource lifecycle
- How to implement proper cleanup functions
- How to monitor cache performance
- How to handle complex context keys

## Architecture

```
Message with Context
  { tenantId: "tenant-a", environment: "prod" }
         ↓
Custom Cache Key Generator
  "tenant-a:prod" (efficient string key)
         ↓
Cache Check
  ├─ Hit: Return cached resource (fast)
  └─ Miss: Create new resource (slower)
         ↓
Resource Used by Listener
         ↓
On Shutdown: Cleanup All Cached Resources
```

## Setup

```bash
npm install
cp .env.example .env

# Start LocalStack
cd .. && docker-compose up -d && cd resource-caching

# Create queue
aws sqs create-queue --queue-name cache-demo --endpoint-url http://localhost:4566

# Run application
npm run start:dev
```

## Testing Cache Behavior

### Test Cache Hits

```bash
# First message - cache miss
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/cache-demo \
  --message-body '{"id":"msg-001","data":"test"}' \
  --message-attributes '{
    "tenantId":{"DataType":"String","StringValue":"tenant-a"},
    "environment":{"DataType":"String","StringValue":"production"}
  }' \
  --endpoint-url http://localhost:4566

# Second message - cache hit (same context)
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/cache-demo \
  --message-body '{"id":"msg-002","data":"test"}' \
  --message-attributes '{
    "tenantId":{"DataType":"String","StringValue":"tenant-a"},
    "environment":{"DataType":"String","StringValue":"production"}
  }' \
  --endpoint-url http://localhost:4566

# Third message - cache miss (different context)
aws sqs send-message \
  --queue-url http://localhost:4566/000000000000/cache-demo \
  --message-body '{"id":"msg-003","data":"test"}' \
  --message-attributes '{
    "tenantId":{"DataType":"String","StringValue":"tenant-b"},
    "environment":{"DataType":"String","StringValue":"staging"}
  }' \
  --endpoint-url http://localhost:4566
```

### Expected Output

```
[Nest] LOG   Cache miss for key: tenant-a:production
[Nest] LOG   Creating new resource for tenant-a:production
[Nest] LOG   Resource created and cached
[Nest] LOG   Processing message msg-001

[Nest] DEBUG Cache hit for key: tenant-a:production
[Nest] LOG   Processing message msg-002 (using cached resource)

[Nest] LOG   Cache miss for key: tenant-b:staging
[Nest] LOG   Creating new resource for tenant-b:staging
[Nest] LOG   Resource created and cached
[Nest] LOG   Processing message msg-003
```

### Test Cleanup on Shutdown

```bash
# Stop the application (Ctrl+C)
# You should see:
[Nest] LOG   Cleaning up 2 cached resources
[Nest] LOG   Cleaning up resource for tenant-a:production
[Nest] LOG   Cleaning up resource for tenant-b:staging
[Nest] LOG   Resource cleanup completed
[Nest] LOG   Stopped container cache-demo-listener
```

## Key Concepts

### Custom Cache Key Generator

Efficient cache key generation:

```typescript
.contextKeyGenerator((context: CacheContext) => {
  // Custom format: tenant:environment
  return `${context.tenantId}:${context.environment}`;
})
```

Without custom generator, default uses `JSON.stringify(context)`:
```typescript
// Default: '{"tenantId":"tenant-a","environment":"production"}'
// Custom:  'tenant-a:production'
```

### Resource Lifecycle

```typescript
class ManagedResource {
  constructor(context) {
    // Initialize resource
    this.connection = createConnection(context);
  }

  async cleanup() {
    // Proper cleanup
    await this.connection.close();
  }
}
```

### Cleanup Function

```typescript
.resourceCleanup(async (resources: CacheResources) => {
  // Called for each cached resource on shutdown
  await resources.connection.close();
  await resources.cache.clear();
  logger.log('Resource cleaned up');
})
```

## Cache Performance Monitoring

### Cache Metrics

The example includes cache performance logging:

```typescript
class CacheMonitor {
  private hits = 0;
  private misses = 0;

  recordHit() {
    this.hits++;
    this.logger.debug(`Cache hit rate: ${this.getHitRate()}%`);
  }

  recordMiss() {
    this.misses++;
    this.logger.debug(`Cache hit rate: ${this.getHitRate()}%`);
  }

  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  }
}
```

## Production Patterns

### Cache Eviction

Implement TTL-based eviction:

```typescript
class ResourceCache {
  private cache = new Map<string, CacheEntry>();

  set(key: string, resource: any, ttl: number) {
    const entry = {
      resource,
      expiresAt: Date.now() + ttl,
    };
    this.cache.set(key, entry);
  }

  get(key: string): any | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.resource;
  }
}
```

### LRU Cache

Implement least-recently-used eviction:

```typescript
import LRU from 'lru-cache';

const resourceCache = new LRU<string, Resource>({
  max: 100, // Maximum 100 cached resources
  ttl: 1000 * 60 * 60, // 1 hour TTL
  dispose: async (resource) => {
    // Cleanup when evicted
    await resource.cleanup();
  },
});
```

### Health Checks

Verify cached resources are healthy:

```typescript
.resourceProvider(async (context): Promise<Resources> => {
  let resource = cache.get(cacheKey);

  if (resource) {
    // Verify resource is still healthy
    const isHealthy = await resource.healthCheck();
    if (!isHealthy) {
      await resource.cleanup();
      resource = null;
    }
  }

  if (!resource) {
    resource = await createResource(context);
    cache.set(cacheKey, resource);
  }

  return resource;
})
```

### Graceful Shutdown

Ensure all resources are cleaned up:

```typescript
process.on('SIGTERM', async () => {
  logger.log('SIGTERM received, shutting down gracefully');
  await container.stop(); // Triggers resource cleanup
  process.exit(0);
});
```

## Cache Key Strategies

### Simple Key

```typescript
.contextKeyGenerator((context) => context.tenantId)
```

### Composite Key

```typescript
.contextKeyGenerator((context) => 
  `${context.tenantId}:${context.region}:${context.environment}`
)
```

### Hashed Key

```typescript
.contextKeyGenerator((context) => {
  const str = JSON.stringify(context);
  return crypto.createHash('md5').update(str).digest('hex');
})
```

## Monitoring and Observability

### Metrics to Track

- Cache hit rate
- Cache size
- Resource creation time
- Resource cleanup time
- Cache eviction count

### Example Metrics

```typescript
class CacheMetrics {
  recordCacheHit(key: string) {
    this.metrics.increment('cache.hits', { key });
  }

  recordCacheMiss(key: string) {
    this.metrics.increment('cache.misses', { key });
  }

  recordResourceCreation(key: string, duration: number) {
    this.metrics.histogram('resource.creation.duration', duration, { key });
  }

  recordCacheSize(size: number) {
    this.metrics.gauge('cache.size', size);
  }
}
```

## Best Practices

1. **Always implement cleanup functions** - Prevent resource leaks
2. **Use efficient cache keys** - Avoid expensive serialization
3. **Monitor cache performance** - Track hit rates and adjust strategy
4. **Implement health checks** - Verify cached resources are valid
5. **Set appropriate TTLs** - Balance performance and freshness
6. **Handle cleanup errors gracefully** - Log but don't throw
7. **Test shutdown behavior** - Ensure proper cleanup

## Troubleshooting

### High Memory Usage

- Implement cache eviction policy
- Reduce cache TTL
- Monitor cache size

### Low Cache Hit Rate

- Review cache key generation
- Check if contexts are consistent
- Verify cache is not being cleared prematurely

### Resource Leaks

- Ensure cleanup function is implemented
- Verify cleanup is called on shutdown
- Check for errors in cleanup logic

## Additional Resources

- [Main Package Documentation](../../README.md)
- [LRU Cache](https://www.npmjs.com/package/lru-cache)
- [Node.js Process Signals](https://nodejs.org/api/process.html#process_signal_events)
