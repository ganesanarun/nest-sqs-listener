import {plainToInstance} from 'class-transformer';
import {Type} from '../types/type';
import {LoggerInterface} from '../logger/logger.interface';
import {PayloadMessagingConverter} from './payload-messaging-converter.interface';
import {SQSMessageAttributes} from '../types/sqs-types';
import {JsonPayloadConverterOptions} from './json-payload-converter-options.interface';
import {MessageContext} from '../listener/message-context.interface';
import {BaseValidatingConverter} from './base-validating-converter';

/**
 * Default implementation of PayloadMessagingConverter that parses JSON message bodies.
 *
 * This converter:
 * - Parses the message body as JSON
 * - Optionally transforms the parsed object into a class instance using class-transformer
 * - Optionally validates the transformed object using class-validator decorators
 * - Handles JSON parsing errors and validation errors appropriately
 *
 * @example
 * ```typescript
 * // Basic usage without validation
 * const converter = new JsonPayloadMessagingConverter(OrderCreatedEvent);
 * const payload = await converter.convert(messageBody);
 * ```
 *
 * @example
 * ```typescript
 * // With validation enabled
 * import { IsString, IsNumber, IsPositive } from 'class-validator';
 *
 * class OrderCreatedEvent {
 *   @IsString()
 *   orderId: string;
 *
 *   @IsNumber()
 *   @IsPositive()
 *   amount: number;
 * }
 *
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.THROW
 *   }
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With validation and whitelist mode
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validatorOptions: {
 *       whitelist: true,              // Strip non-decorated properties
 *       forbidNonWhitelisted: true    // Throw error on extra properties
 *     },
 *     validationFailureMode: ValidationFailureMode.THROW
 *   },
 *   logger
 * );
 * ```
 *
 * @example
 * ```typescript
 * // With ACKNOWLEDGE mode (discard invalid messages)
 * const converter = new JsonPayloadMessagingConverter(
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
 *   },
 *   logger
 * );
 * // Invalid messages will be logged and removed from queue
 * ```
 *
 * @example
 * ```typescript
 * // Use with ContainerOptions fluent API
 * container.configure(options => {
 *   options
 *     .queueName('order-queue')
 *     .targetClass(OrderCreatedEvent)
 *     .enableValidation(true)
 *     .validationFailureMode(ValidationFailureMode.THROW)
 *     .validatorOptions({ whitelist: true });
 * });
 * // ContainerOptions automatically creates JsonPayloadMessagingConverter
 * ```
 *
 * @template T The type of the payload object after conversion
 */
export class JsonPayloadMessagingConverter<T> extends BaseValidatingConverter<T> implements PayloadMessagingConverter<T> {
    /**
     * Creates a new JsonPayloadMessagingConverter.
     *
     * @param targetClass Optional class constructor to transform the parsed JSON into.
     *                    If provided, uses class-transformer's plainToInstance.
     *                    If not provided, returns the parsed JSON object as-is.
     * @param options Optional validation configuration options
     * @param logger Optional logger for logging validation failures
     */
    constructor(
        targetClass?: Type<T>,
        options?: JsonPayloadConverterOptions,
        logger?: LoggerInterface
    ) {
        super(targetClass, options, logger);
    }

    /**
     * Converts a JSON string message body into a typed payload object.
     * Optionally validates the payload using class-validator decorators.
     *
     * @param body The raw message body string (expected to be valid JSON)
     * @param attributes The message attributes (not used in default implementation)
     * @param context Optional message context for acknowledgement in validation failure modes
     * @returns The typed payload object (or Promise if validation is enabled)
     * @throws SyntaxError if the body is not valid JSON
     * @throws MessageValidationError if validation fails and mode is THROW
     */
    async convert(body: string, attributes?: SQSMessageAttributes, context?: MessageContext): Promise<T> {
        try {
            const parsed = JSON.parse(body);

            // Transform to class instance if target class provided
            let instance: T;
            if (this.targetClass) {
                instance = plainToInstance(this.targetClass, parsed);
            } else {
                instance = parsed as T;
            }

            // Validate if enabled and target class provided
            if (this.enableValidation && this.targetClass) {
                const validationErrors = await this.validatePayload(instance);
                
                if (validationErrors.length > 0) {
                    await this.handleValidationFailure(validationErrors, body, context);
                    // If we reach here in ACKNOWLEDGE/REJECT modes, return instance anyway
                    // (though listener won't be invoked)
                }
            }

            return instance;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse message body as JSON: ${error.message}`);
            }
            throw error;
        }
    }


}
