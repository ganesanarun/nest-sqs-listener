import { Injectable, Logger } from '@nestjs/common';
import { CustomerConfig } from './customer-config';

@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  async getCustomerConfig(customerId: string): Promise<CustomerConfig> {
    this.logger.log(`Loading configuration for customer ${customerId}`);

    // Simulated customer configurations
    const configs: Record<string, CustomerConfig> = {
      'customer-premium': {
        customerId: 'customer-premium',
        tier: 'premium',
        rateLimit: 1000,
        features: ['advanced-analytics', 'priority-support', 'custom-reports'],
        priority: 'high',
      },
      'customer-standard': {
        customerId: 'customer-standard',
        tier: 'standard',
        rateLimit: 100,
        features: ['basic-analytics'],
        priority: 'normal',
      },
      'customer-trial': {
        customerId: 'customer-trial',
        tier: 'trial',
        rateLimit: 10,
        features: [],
        priority: 'low',
      },
    };

    const config = configs[customerId];
    if (!config) {
      throw new Error(`Unknown customer: ${customerId}`);
    }

    return config;
  }
}
