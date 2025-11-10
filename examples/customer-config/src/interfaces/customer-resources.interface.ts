import { CustomerConfig } from '../config/customer-config';
import { RateLimiter } from '../services/rate-limiter';

export interface CustomerResources {
  config: CustomerConfig;
  rateLimiter: RateLimiter;
}
