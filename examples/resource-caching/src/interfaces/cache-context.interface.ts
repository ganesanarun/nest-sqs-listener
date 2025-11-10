export interface CacheContext {
  tenantId: string;
  environment: 'production' | 'staging' | 'development';
}
