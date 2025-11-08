import {JsonPayloadMessagingConverter} from '../src/converter/json-payload-messaging-converter';
import {SQSMessageAttributes} from '../src';

// Test class for class-transformer testing
class OrderEvent {
    orderId!: string;
    customerId!: string;
    amount!: number;
}

describe('JsonPayloadMessagingConverter', () => {
    describe('converting valid JSON to plain object', () => {
        it('should parse valid JSON string to plain object', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = converter.convert(body);

            expect(result).toEqual({orderId: '123', amount: 100});
        });

        it('should parse complex nested JSON objects', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({
                order: {id: '123', items: [{sku: 'ABC', qty: 2}]},
                customer: {id: '456', name: 'John'}
            });

            const result = converter.convert(body);

            expect(result).toEqual({
                order: {id: '123', items: [{sku: 'ABC', qty: 2}]},
                customer: {id: '456', name: 'John'}
            });
        });

        it('should parse JSON arrays', () => {
            const converter = new JsonPayloadMessagingConverter<any[]>();
            const body = JSON.stringify([{id: 1}, {id: 2}]);

            const result = converter.convert(body);

            expect(result).toEqual([{id: 1}, {id: 2}]);
        });
    });

    describe('converting JSON with class-transformer when targetClass provided', () => {
        it('should transform parsed JSON to class instance when targetClass provided', () => {
            const converter = new JsonPayloadMessagingConverter<OrderEvent>(OrderEvent);
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100});

            const result = converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
            expect(result.customerId).toBe('456');
            expect(result.amount).toBe(100);
        });

        it('should handle class transformation with missing optional fields', () => {
            const converter = new JsonPayloadMessagingConverter<OrderEvent>(OrderEvent);
            const body = JSON.stringify({orderId: '123'});

            const result = converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
        });
    });

    describe('error handling for invalid JSON', () => {
        it('should throw error for invalid JSON syntax', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const invalidBody = '{ invalid json }';

            expect(() => converter.convert(invalidBody)).toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for empty string', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const emptyBody = '';

            expect(() => converter.convert(emptyBody)).toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for malformed JSON', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const malformedBody = '{"key": "value"';

            expect(() => converter.convert(malformedBody)).toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for non-JSON string', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const nonJsonBody = 'this is not json';

            expect(() => converter.convert(nonJsonBody)).toThrow('Failed to parse message body as JSON');
        });
    });

    describe('handling of message attributes parameter', () => {
        it('should accept message attributes parameter', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});
            const attributes: SQSMessageAttributes = {
                'TraceId': {StringValue: 'trace-123', DataType: 'String'}
            };

            const result = converter.convert(body, attributes);

            expect(result).toEqual({orderId: '123'});
        });

        it('should work without message attributes parameter', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});

            const result = converter.convert(body);

            expect(result).toEqual({orderId: '123'});
        });

        it('should work with empty message attributes', () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});
            const attributes: SQSMessageAttributes = {};

            const result = converter.convert(body, attributes);

            expect(result).toEqual({orderId: '123'});
        });
    });
});
