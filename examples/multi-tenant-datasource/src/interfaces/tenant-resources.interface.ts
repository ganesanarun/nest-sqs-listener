import { TenantDataSource } from '../datasource/tenant-datasource';

/**
 * Tenant-specific resources provided to the message listener.
 * These resources are cached and reused for messages from the same tenant.
 */
export interface TenantResources {
  /**
   * Tenant-specific database connection/datasource
   */
  dataSource: TenantDataSource;
}
