import {plainToInstance} from 'class-transformer';
import {Type} from '@nestjs/common';
import {PayloadMessagingConverter} from './payload-messaging-converter.interface';
import {SQSMessageAttributes} from '../types/sqs-types';

/**
 * Default implementation of PayloadMessagingConverter that parses JSON message bodies.
 *
 * This converter:
 * - Parses the message body as JSON
 * - Optionally transforms the parsed object into a class instance using class-transformer
 * - Handles JSON parsing errors appropriately
 *
 * @template T The type of the payload object after conversion
 */
export class JsonPayloadMessagingConverter<T> implements PayloadMessagingConverter<T> {
    /**
     * Creates a new JsonPayloadMessagingConverter.
     *
     * @param targetClass Optional class constructor to transform the parsed JSON into.
     *                    If provided, uses class-transformer's plainToInstance.
     *                    If not provided, returns the parsed JSON object as-is.
     */
    constructor(private readonly targetClass?: Type<T>) {
    }

    /**
     * Converts a JSON string message body into a typed payload object.
     *
     * @param body The raw message body string (expected to be valid JSON)
     * @param attributes The message attributes (not used in default implementation)
     * @returns The typed payload object
     * @throws SyntaxError if the body is not valid JSON
     */
    convert(body: string, attributes?: SQSMessageAttributes): T {
        try {
            const parsed = JSON.parse(body);

            if (this.targetClass) {
                return plainToInstance(this.targetClass, parsed);
            }

            return parsed as T;
        } catch (error) {
            if (error instanceof SyntaxError) {
                throw new Error(`Failed to parse message body as JSON: ${error.message}`);
            }
            throw error;
        }
    }
}
