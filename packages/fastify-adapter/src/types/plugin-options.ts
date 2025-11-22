import {SQSClient} from '@aws-sdk/client-sqs';
import {AcknowledgementMode, LoggerInterface, QueueListener, Type, ValidationFailureMode, ValidatorOptions} from '@snow-tzu/sqs-listener';

/**
 * Configuration for a single message listener registration.
 */
export interface FastifyListenerConfig<T = any> {
    /** The message type class/constructor for type validation and conversion */
    messageType: Type<T>;
    /** The listener instance that will handle messages of this type */
    listener: QueueListener<T>;
}

/**
 * Options for configuring the Fastify SQS Listener plugin.
 *
 * These options extend the core container configuration with Fastify-specific
 * settings for registering a single listener per plugin instance.
 */
export interface FastifySqsListenerOptions<T = any> {
    /** SQS queue URL or queue name to listen to */
    queueNameOrUrl: string;

    /** Single listener configuration for the message type */
    listener: FastifyListenerConfig<T>;

    /** AWS SQS client instance */
    sqsClient: SQSClient;

    /** Whether to automatically start the listener when Fastify is ready (default: true) */
    autoStartup?: boolean;

    /** Maximum number of messages to process concurrently (default: 10) */
    maxConcurrentMessages?: number;

    /** Maximum number of messages to receive per poll (default: 10) */
    maxMessagesPerPoll?: number;

    /** SQS long polling timeout in seconds (default: 20) */
    pollTimeout?: number;

    /** SQS message visibility timeout in seconds (default: 30) */
    visibilityTimeout?: number;

    /** When to acknowledge messages (default: ON_SUCCESS) */
    acknowledgementMode?: AcknowledgementMode;

    /** Backoff time in seconds when polling encounters errors (default: 5) */
    pollingErrorBackoff?: number;

    /** Custom logger instance (defaults to Fastify's logger) */
    logger?: LoggerInterface;

    /** Container ID for logging and monitoring (defaults to 'fastify-sqs-listener') */
    containerId?: string;

    /** 
     * Enable automatic validation using class-validator decorators.
     * 
     * When enabled, incoming messages will be validated against the messageType class
     * using class-validator decorators before being passed to the listener.
     * Requires the messageType to have class-validator decorators.
     * 
     * @example
     * ```typescript
     * class OrderEvent {
     *   @IsString()
     *   orderId: string;
     *   
     *   @IsNumber()
     *   @Min(0)
     *   amount: number;
     * }
     * 
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableValidation: true
     * });
     * ```
     * 
     * @default false
     */
    enableValidation?: boolean;

    /** 
     * Behavior when validation fails.
     * 
     * Controls how the system responds when a message fails validation:
     * - `ValidationFailureMode.THROW`: Throw error and invoke error handler (default)
     *   The message remains in the queue and may be retried
     * - `ValidationFailureMode.ACKNOWLEDGE`: Log error and remove message from queue
     *   The invalid message is discarded and won't be retried
     * - `ValidationFailureMode.REJECT`: Log error and allow message to retry
     *   The message is returned to the queue for potential retry
     * 
     * Only used when enableValidation is true.
     * 
     * @example
     * ```typescript
     * // Remove invalid messages from queue
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableValidation: true,
     *   validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
     * });
     * ```
     * 
     * @default ValidationFailureMode.THROW
     */
    validationFailureMode?: ValidationFailureMode;

    /** 
     * Options passed to class-validator's validate function.
     * 
     * Allows fine-tuning of validation behavior. Common options include:
     * - `whitelist`: Strip properties not defined in the class (removes unknown properties)
     * - `forbidNonWhitelisted`: Throw error for unknown properties (strict mode)
     * - `groups`: Validate only specific validation groups
     * - `skipMissingProperties`: Skip validation of undefined properties
     * - `stopAtFirstError`: Stop validation on first error (faster but less detailed)
     * - `validationError.target`: Include target object in validation errors
     * - `validationError.value`: Include invalid values in validation errors
     * 
     * Only used when enableValidation is true.
     * 
     * @example
     * ```typescript
     * // Strict validation with property whitelisting
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableValidation: true,
     *   validatorOptions: {
     *     whitelist: true,
     *     forbidNonWhitelisted: true,
     *     stopAtFirstError: false
     *   }
     * });
     * 
     * // Validation groups example
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableValidation: true,
     *   validatorOptions: {
     *     groups: ['create', 'update']
     *   }
     * });
     * ```
     */
    validatorOptions?: ValidatorOptions;

    /** 
     * Enable batch acknowledgements to reduce SQS API calls.
     * 
     * When enabled, message deletions are batched into groups of up to 10
     * messages per API call, reducing network overhead by up to 10x.
     * This is particularly beneficial for high-throughput applications
     * processing many messages per second.
     * 
     * Batch acknowledgement works by collecting message deletion requests
     * and sending them in batches to SQS using the DeleteMessageBatch API.
     * Messages are batched based on maxSize and flushed at regular intervals
     * defined by flushIntervalMs.
     * 
     * @example
     * ```typescript
     * // Enable batch acknowledgement with defaults
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableBatchAcknowledgement: true
     * });
     * 
     * // Enable with custom batch settings
     * await fastify.register(sqsListenerPlugin, {
     *   queueNameOrUrl: 'orders',
     *   listener: { messageType: OrderEvent, listener: new OrderListener() },
     *   sqsClient,
     *   enableBatchAcknowledgement: true,
     *   batchAcknowledgementOptions: {
     *     maxSize: 8,        // Batch up to 8 messages
     *     flushIntervalMs: 50 // Flush every 50ms
     *   }
     * });
     * ```
     * 
     * @default false
     */
    enableBatchAcknowledgement?: boolean;

    /** 
     * Configuration options for batch acknowledgement behavior.
     * 
     * Only applies when enableBatchAcknowledgement is true.
     * If not provided, default values will be used (maxSize: 10, flushIntervalMs: 100).
     * 
     * The maxSize determines how many messages are batched together before
     * sending a DeleteMessageBatch request to SQS. AWS SQS supports up to
     * 10 messages per batch request.
     * 
     * The flushIntervalMs determines how often partial batches are flushed
     * to ensure messages don't wait too long for acknowledgement, even if
     * the batch isn't full.
     * 
     * @example
     * ```typescript
     * // Conservative batching for lower latency
     * batchAcknowledgementOptions: {
     *   maxSize: 5,         // Smaller batches
     *   flushIntervalMs: 25 // More frequent flushes
     * }
     * 
     * // Aggressive batching for maximum throughput
     * batchAcknowledgementOptions: {
     *   maxSize: 10,         // Maximum batch size
     *   flushIntervalMs: 200 // Less frequent flushes
     * }
     * 
     * // Immediate flushing (no batching delay)
     * batchAcknowledgementOptions: {
     *   maxSize: 10,
     *   flushIntervalMs: 0   // Flush immediately when batch is ready
     * }
     * ```
     */
    batchAcknowledgementOptions?: {
        /** 
         * Maximum number of messages per batch.
         * 
         * Must be between 1 and 10 (inclusive) to comply with AWS SQS
         * DeleteMessageBatch API limits. Higher values reduce API calls
         * but may increase latency for individual message acknowledgements.
         * 
         * @minimum 1
         * @maximum 10
         * @default 10
         */
        maxSize?: number;
        
        /** 
         * Flush interval for partial batches in milliseconds.
         * 
         * Determines how often partial batches are sent to SQS even if
         * they haven't reached maxSize. This prevents messages from waiting
         * indefinitely for acknowledgement in low-throughput scenarios.
         * 
         * Set to 0 to disable interval-based flushing (batches will only
         * be sent when they reach maxSize).
         * 
         * @minimum 0
         * @default 100
         */
        flushIntervalMs?: number;
    };
}