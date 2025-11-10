import { Injectable, Logger } from '@nestjs/common';
import { EnvironmentConfig } from './environment-config';

/**
 * Service for managing environment-specific configurations.
 * In production, this would load from AWS Secrets Manager, Parameter Store, etc.
 */
@Injectable()
export class ConfigService {
  private readonly logger = new Logger(ConfigService.name);

  /**
   * Get configuration for the specified environment and region.
   */
  getConfig(environment: string, region: string): EnvironmentConfig {
    this.logger.log(`Loading configuration for ${environment} in ${region}`);

    // In production, load from secure storage
    const configs: Record<string, Partial<EnvironmentConfig>> = {
      production: {
        apiEndpoint:
          process.env.PROD_API_ENDPOINT ||
          'https://api.production.example.com',
        apiKey: process.env.PROD_API_KEY || 'prod-key-123',
        timeout: 5000,
      },
      staging: {
        apiEndpoint:
          process.env.STAGING_API_ENDPOINT ||
          'https://api.staging.example.com',
        apiKey: process.env.STAGING_API_KEY || 'staging-key-456',
        timeout: 10000,
      },
      development: {
        apiEndpoint:
          process.env.DEV_API_ENDPOINT || 'https://api.dev.example.com',
        apiKey: process.env.DEV_API_KEY || 'dev-key-789',
        timeout: 30000,
      },
    };

    const baseConfig = configs[environment];
    if (!baseConfig) {
      throw new Error(`Unknown environment: ${environment}`);
    }

    return {
      ...baseConfig,
      environment,
      region,
    } as EnvironmentConfig;
  }
}
