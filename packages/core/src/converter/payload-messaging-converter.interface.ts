import {SQSMessageAttributes} from '../types/sqs-types';
import {MessageContext} from '../listener/message-context.interface';

/**
 * Interface for converting raw SQS message bodies into typed payloads.
 *
 * Implementations can perform JSON parsing, XML parsing, deserialization,
 * validation, or any other transformation needed to convert the raw message
 * body string into a strongly typed object.
 *
 * @template T The type of the payload object after conversion
 */
export interface PayloadMessagingConverter<T> {
    /**
     * Converts a raw SQS message body string into a typed payload object.
     *
     * @param body The raw message body string from SQS
     * @param attributes The message attributes from SQS (optional, can be used for conversion logic)
     * @param context The message context containing metadata and acknowledgement methods (optional).
     *                This allows converters to acknowledge messages directly when needed,
     *                such as in validation failure scenarios with ACKNOWLEDGE mode.
     * @returns The typed payload object, either synchronously or asynchronously
     * @throws Error if the conversion fails (e.g., invalid JSON, validation errors)
     */
    convert(body: string, attributes?: SQSMessageAttributes, context?: MessageContext): T | Promise<T>;
}
