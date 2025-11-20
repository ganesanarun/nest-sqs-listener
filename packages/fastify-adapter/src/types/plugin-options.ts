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
}