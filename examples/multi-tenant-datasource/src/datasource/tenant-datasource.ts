import { Logger } from '@nestjs/common';

/**
 * Simulated tenant-specific datasource.
 * In a real application, this would be a TypeORM DataSource, Prisma Client,
 * or other database connection specific to the tenant.
 */
export class TenantDataSource {
  private readonly logger = new Logger(TenantDataSource.name);
  private initialized = false;

  constructor(
    private readonly tenantId: string,
    private readonly region: string,
  ) {
    this.logger.log(
      `Created datasource for tenant ${tenantId} in region ${region}`,
    );
  }

  /**
   * Get the datasource identifier
   */
  getName(): string {
    return `${this.tenantId}-${this.region}-db`;
  }

  /**
   * Simulate a database query
   */
  async query(sql: string, params?: any[]): Promise<any> {
    this.logger.debug(
      `Executing query on ${this.getName()}: ${sql}`,
      params,
    );
    // Simulate query execution
    return { affected: 1 };
  }

  /**
   * Initialize the datasource (simulate connection)
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    this.logger.log(`Initializing datasource ${this.getName()}`);
    // Simulate connection initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
    this.initialized = true;
    this.logger.log(`Datasource ${this.getName()} initialized`);
  }

  /**
   * Destroy the datasource (cleanup connections)
   */
  async destroy(): Promise<void> {
    if (!this.initialized) {
      return;
    }

    this.logger.log(`Destroying datasource ${this.getName()}`);
    // Simulate connection cleanup
    await new Promise((resolve) => setTimeout(resolve, 50));
    this.initialized = false;
    this.logger.log(`Datasource ${this.getName()} destroyed`);
  }

  /**
   * Check if datasource is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
