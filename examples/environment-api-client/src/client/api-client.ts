import { Logger } from '@nestjs/common';
import { EnvironmentConfig } from '../config/environment-config';

/**
 * Simulated API client for making requests to environment-specific endpoints.
 * In production, this would use axios, fetch, or other HTTP client.
 */
export class ApiClient {
  private readonly logger = new Logger(ApiClient.name);

  constructor(private readonly config: EnvironmentConfig) {
    this.logger.log(
      `Created API client for ${config.environment} (${config.apiEndpoint})`,
    );
  }

  /**
   * Get the API endpoint
   */
  getEndpoint(): string {
    return this.config.apiEndpoint;
  }

  /**
   * Get the environment name
   */
  getEnvironment(): string {
    return this.config.environment;
  }

  /**
   * Send an event to the API
   */
  async sendEvent(eventType: string, data: any): Promise<void> {
    this.logger.log(
      `Sending ${eventType} event to ${this.config.environment} API`,
    );

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 100));

    this.logger.debug(
      `Event sent successfully to ${this.config.apiEndpoint}`,
      { eventType, data },
    );
  }

  /**
   * Close the API client (cleanup)
   */
  async close(): Promise<void> {
    this.logger.log(
      `Closing API client for ${this.config.environment}`,
    );
    // Simulate cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}
