import {plainToInstance} from 'class-transformer';
import {Type} from '../types/type';
import {LoggerInterface} from '../logger/logger.interface';
import {PayloadMessagingConverter} from './payload-messaging-converter.interface';
import {SQSMessageAttributes} from '../types/sqs-types';
import {JsonPayloadConverterOptions} from './json-payload-converter-options.interface';
import {MessageContext} from '../listener/message-context.interface';
import {BaseValidatingConverter} from './base-validating-converter';

/**
 * Decorator implementation that wraps any PayloadMessagingConverter with validation capabilities.
 *
 * This converter follows the Decorator pattern:
 * - Delegates conversion to an inner converter (JSON, XML, Protobuf, etc.)
 * - Adds validation layer on top using class-validator decorators
 * - Handles validation failures based on configured mode
 *
 * Benefits:
 * - Works with any custom converter implementation
 * - Separates conversion logic from validation logic
 * - Reusable validation behavior across different message formats
 *
 * @example
 * ```typescript
 * // Wrap a custom XML converter with validation
 * class XmlPayloadConverter implements PayloadMessagingConverter<OrderCreatedEvent> {
 *   convert(body: string): OrderCreatedEvent {
 *     return parseXml(body); // Custom XML parsing logic
 *   }
 * }
 *
 * const xmlConverter = new XmlPayloadConverter();
 * const validatingConverter = new ValidatingPayloadConverter(
 *   xmlConverter,
 *   OrderCreatedEvent,
 *   {
 *     enableValidation: true,
 *     validationFailureMode: ValidationFailureMode.THROW,
 *     validatorOptions: { whitelist: true }
 *   },
 *   logger
 * );
 * ```
 *
 * @example
 * ```typescript
 * // Use with ContainerOptions for automatic wrapping
 * container.configure(options => {
 *   options
 *     .queueName('order-queue')
 *     .messageConverter(new XmlPayloadConverter())
 *     .targetClass(OrderCreatedEvent)
 *     .enableValidation(true)
 *     .validationFailureMode(ValidationFailureMode.ACKNOWLEDGE);
 * });
 * // ContainerOptions automatically wraps XmlPayloadConverter with ValidatingPayloadConverter
 * ```
 *
 * @example
 * ```typescript
 * // Wrap a Protobuf converter with validation
 * class ProtobufConverter implements PayloadMessagingConverter<OrderCreatedEvent> {
 *   convert(body: string): OrderCreatedEvent {
 *     const buffer = Buffer.from(body, 'base64');
 *     return OrderCreatedEvent.decode(buffer);
 *   }
 * }
 *
 * const validatingConverter = new ValidatingPayloadConverter(
 *   new ProtobufConverter(),
 *   OrderCreatedEvent,
 *   { enableValidation: true }
 * );
 * ```
 *
 * @template T The type of the payload object after conversion and validation
 */
export class ValidatingPayloadConverter<T> extends BaseValidatingConverter<T> implements PayloadMessagingConverter<T> {
    /**
     * Creates a new ValidatingPayloadConverter that wraps an existing converter.
     *
     * @param innerConverter The converter to wrap (handles actual message format conversion)
     * @param targetClass The class constructor to transform and validate against
     * @param options Optional validation configuration options
     * @param logger Optional logger for logging validation failures
     */
    constructor(
        private readonly innerConverter: PayloadMessagingConverter<T>,
        targetClass: Type<T>,
        options?: JsonPayloadConverterOptions,
        logger?: LoggerInterface
    ) {
        super(targetClass, options, logger);
    }

    /**
     * Converts a message body by delegating to the inner converter,
     * then optionally validates the result using class-validator decorators.
     *
     * @param body The raw message body string
     * @param attributes The message attributes
     * @param context Optional message context for acknowledgement in validation failure modes
     * @returns The typed and validated payload object
     * @throws MessageValidationError if validation fails and mode is THROW
     */
    async convert(body: string, attributes?: SQSMessageAttributes, context?: MessageContext): Promise<T> {
        // 1. Delegate to inner converter
        const payload = await this.innerConverter.convert(body, attributes, context);

        // 2. If validation disabled, return as-is
        if (!this.enableValidation) {
            return payload;
        }

        // 3. Transform to class instance if needed
        // targetClass is guaranteed to be defined in constructor
        const instance = payload instanceof this.targetClass!
            ? payload
            : plainToInstance(this.targetClass!, payload as any);

        // 4. Validate
        const validationErrors = await this.validatePayload(instance);

        // 5. Handle validation failure
        if (validationErrors.length > 0) {
            await this.handleValidationFailure(validationErrors, body, context);
            // If we reach here in ACKNOWLEDGE/REJECT modes, return instance anyway
            // (though listener won't be invoked)
        }

        return instance;
    }


}
