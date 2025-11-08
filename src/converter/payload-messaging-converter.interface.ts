import {SQSMessageAttributes} from '../types/sqs-types';

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
     * @returns The typed payload object, either synchronously or asynchronously
     * @throws Error if the conversion fails (e.g., invalid JSON, validation errors)
     */
    convert(body: string, attributes?: SQSMessageAttributes): T | Promise<T>;
}
