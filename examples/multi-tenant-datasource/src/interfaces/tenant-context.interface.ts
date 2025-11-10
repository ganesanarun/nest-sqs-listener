/**
 * Tenant context extracted from SQS message attributes.
 * Contains information needed to identify which tenant's resources to use.
 */
export interface TenantContext {
  /**
   * Unique identifier for the tenant
   */
  tenantId: string;

  /**
   * AWS region where the tenant's resources are located
   */
  region: string;
}
