import { Logger } from '@nestjs/common';

export class RateLimiter {
  private readonly logger = new Logger(RateLimiter.name);
  private tokens: number;
  private lastRefill: number;

  constructor(
    private readonly limit: number,
    private readonly windowMs: number = 60000,
  ) {
    this.tokens = limit;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens > 0) {
      this.tokens--;
      this.logger.debug(`Token acquired. Remaining: ${this.tokens}/${this.limit}`);
    } else {
      throw new Error('Rate limit exceeded');
    }
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.windowMs) {
      this.tokens = this.limit;
      this.lastRefill = now;
      this.logger.debug(`Tokens refilled to ${this.limit}`);
    }
  }

  async cleanup(): Promise<void> {
    this.logger.log('Cleaning up rate limiter');
  }
}
