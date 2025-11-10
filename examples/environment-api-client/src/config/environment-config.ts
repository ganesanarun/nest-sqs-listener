/**
 * Configuration for a specific environment.
 */
export interface EnvironmentConfig {
  /**
   * API endpoint URL
   */
  apiEndpoint: string;

  /**
   * API authentication key
   */
  apiKey: string;

  /**
   * Request timeout in milliseconds
   */
  timeout: number;

  /**
   * Environment name
   */
  environment: string;

  /**
   * Region
   */
  region: string;
}
