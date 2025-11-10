import { ApiClient } from '../client/api-client';
import { EnvironmentConfig } from '../config/environment-config';

/**
 * Environment-specific resources provided to the message listener.
 */
export interface EnvironmentResources {
  /**
   * Environment-specific API client
   */
  apiClient: ApiClient;

  /**
   * Environment configuration
   */
  config: EnvironmentConfig;
}
