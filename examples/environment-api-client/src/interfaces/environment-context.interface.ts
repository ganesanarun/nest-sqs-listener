/**
 * Environment context extracted from SQS message attributes.
 */
export interface EnvironmentContext {
  /**
   * Deployment environment
   */
  environment: 'production' | 'staging' | 'development';

  /**
   * AWS region
   */
  region: string;
}
