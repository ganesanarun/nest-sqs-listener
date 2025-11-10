import {SQSMessageAttributes} from './sqs-types';

/**
 * Function that extracts context information from SQS message attributes.
 * 
 * The context resolver is invoked before message payload conversion and provides
 * a way to extract typed context information (such as tenant ID, environment, region)
 * from message attributes. This context can then be used to provision resources
 * and is made available to the message listener.
 * 
 * @template TContext The type of the context object to be extracted
 * 
 * @param attributes - SQS message attributes containing context information
 * @returns Strongly-typed context object extracted from attributes
 * @throws Error if required attributes are missing or invalid
 * 
 * @example
 * ```typescript
 * // Define context type
 * interface TenantContext {
 *   tenantId: string;
 *   region: string;
 * }
 * 
 * // Implement context resolver
 * const tenantContextResolver: ContextResolver<TenantContext> = (attributes) => {
 *   const tenantId = attributes['tenantId']?.StringValue;
 *   const region = attributes['region']?.StringValue;
 *   
 *   if (!tenantId || !region) {
 *     throw new Error('Missing required tenant attributes');
 *   }
 *   
 *   return { tenantId, region };
 * };
 * 
 * // Use in container configuration
 * container.configure(options => {
 *   options
 *     .queueName('orders-queue')
 *     .contextResolver(tenantContextResolver);
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Environment-based context
 * interface EnvironmentContext {
 *   environment: 'production' | 'staging' | 'development';
 *   region: string;
 * }
 * 
 * const envContextResolver: ContextResolver<EnvironmentContext> = (attributes) => {
 *   const environment = attributes['environment']?.StringValue as EnvironmentContext['environment'];
 *   const region = attributes['region']?.StringValue || 'us-east-1';
 *   
 *   if (!environment) {
 *     throw new Error('Missing environment attribute');
 *   }
 *   
 *   return { environment, region };
 * };
 * ```
 */
export type ContextResolver<TContext> = (
    attributes: SQSMessageAttributes
) => TContext;

/**
 * Function that provides resources based on resolved context.
 * 
 * The resource provider is invoked after context resolution and is responsible
 * for provisioning context-specific resources such as database connections,
 * API clients, or configuration objects. Resources are cached by context key
 * to avoid redundant initialization for messages with the same context.
 * 
 * @template TContext The type of the context object
 * @template TResources The type of the resources object to be provided
 * 
 * @param context - Resolved context object from the context resolver
 * @returns Promise resolving to strongly-typed resources object
 * @throws Error if resource provisioning fails
 * 
 * @example
 * ```typescript
 * // Define resource type
 * interface TenantResources {
 *   dataSource: DataSource;
 * }
 * 
 * // Implement resource provider
 * const tenantResourceProvider: ResourceProvider<TenantContext, TenantResources> = 
 *   async (context) => {
 *     const dataSource = await dataSourceManager.getDataSource(
 *       context.tenantId,
 *       context.region
 *     );
 *     return { dataSource };
 *   };
 * 
 * // Use in container configuration
 * container.configure(options => {
 *   options
 *     .queueName('orders-queue')
 *     .contextResolver(tenantContextResolver)
 *     .resourceProvider(tenantResourceProvider);
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // API client provisioning
 * interface EnvironmentResources {
 *   apiClient: ApiClient;
 *   config: EnvironmentConfig;
 * }
 * 
 * const envResourceProvider: ResourceProvider<EnvironmentContext, EnvironmentResources> = 
 *   async (context) => {
 *     const config = await configService.getConfig(
 *       context.environment,
 *       context.region
 *     );
 *     const apiClient = new ApiClient(config.apiEndpoint, config.apiKey);
 *     return { apiClient, config };
 *   };
 * ```
 * 
 * @example
 * ```typescript
 * // Customer-specific configuration
 * interface CustomerResources {
 *   customerConfig: CustomerConfig;
 *   rateLimiter: RateLimiter;
 * }
 * 
 * const customerResourceProvider: ResourceProvider<CustomerContext, CustomerResources> = 
 *   async (context) => {
 *     const customerConfig = await customerConfigService.getConfig(context.customerId);
 *     const rateLimiter = new RateLimiter(customerConfig.rateLimit);
 *     return { customerConfig, rateLimiter };
 *   };
 * ```
 */
export type ResourceProvider<TContext, TResources> = (
    context: TContext
) => Promise<TResources>;

/**
 * Function that generates a unique cache key from a context object.
 * 
 * The context key generator is used to create cache keys for resource caching.
 * By default, the container uses JSON.stringify to generate keys, but a custom
 * generator can be provided for more efficient or specific key generation.
 * 
 * @template TContext The type of the context object
 * 
 * @param context - Resolved context object
 * @returns String key for resource caching
 * 
 * @example
 * ```typescript
 * // Simple key generator for tenant context
 * const tenantKeyGenerator: ContextKeyGenerator<TenantContext> = (context) => {
 *   return `${context.tenantId}-${context.region}`;
 * };
 * 
 * // Use in container configuration
 * container.configure(options => {
 *   options
 *     .queueName('orders-queue')
 *     .contextResolver(tenantContextResolver)
 *     .resourceProvider(tenantResourceProvider)
 *     .contextKeyGenerator(tenantKeyGenerator);
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Hash-based key generator for complex contexts
 * const hashKeyGenerator: ContextKeyGenerator<ComplexContext> = (context) => {
 *   const hash = crypto.createHash('sha256');
 *   hash.update(JSON.stringify(context));
 *   return hash.digest('hex');
 * };
 * ```
 * 
 * @example
 * ```typescript
 * // Environment-based key generator
 * const envKeyGenerator: ContextKeyGenerator<EnvironmentContext> = (context) => {
 *   return `${context.environment}:${context.region}`;
 * };
 * ```
 */
export type ContextKeyGenerator<TContext> = (context: TContext) => string;

/**
 * Function that cleans up resources when the container stops.
 * 
 * The resource cleanup function is invoked during container shutdown for all
 * cached resources. It should properly dispose of resources such as closing
 * database connections, releasing file handles, or cleaning up temporary data.
 * Cleanup errors are logged but do not prevent container shutdown.
 * 
 * @template TResources The type of the resources object
 * 
 * @param resources - Resources object to clean up
 * @returns Promise resolving when cleanup is complete
 * @throws Error if cleanup fails (errors are logged but not propagated)
 * 
 * @example
 * ```typescript
 * // Cleanup database connections
 * const tenantResourceCleanup: ResourceCleanup<TenantResources> = 
 *   async (resources) => {
 *     if (resources.dataSource?.isInitialized) {
 *       await resources.dataSource.destroy();
 *     }
 *   };
 * 
 * // Use in container configuration
 * container.configure(options => {
 *   options
 *     .queueName('orders-queue')
 *     .contextResolver(tenantContextResolver)
 *     .resourceProvider(tenantResourceProvider)
 *     .resourceCleanup(tenantResourceCleanup);
 * });
 * ```
 * 
 * @example
 * ```typescript
 * // Cleanup API clients and connections
 * const envResourceCleanup: ResourceCleanup<EnvironmentResources> = 
 *   async (resources) => {
 *     await resources.apiClient.close();
 *     // Additional cleanup as needed
 *   };
 * ```
 * 
 * @example
 * ```typescript
 * // Cleanup with error handling
 * const customerResourceCleanup: ResourceCleanup<CustomerResources> = 
 *   async (resources) => {
 *     try {
 *       await resources.rateLimiter.shutdown();
 *     } catch (error) {
 *       // Errors are logged by the container, but you can add custom handling
 *       console.error('Failed to shutdown rate limiter', error);
 *     }
 *   };
 * ```
 */
export type ResourceCleanup<TResources> = (
    resources: TResources
) => Promise<void>;
