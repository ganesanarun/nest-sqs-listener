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
        it('should parse valid JSON string to plain object', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await converter.convert(body);

            expect(result).toEqual({orderId: '123', amount: 100});
        });

        it('should parse complex nested JSON objects', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({
                order: {id: '123', items: [{sku: 'ABC', qty: 2}]},
                customer: {id: '456', name: 'John'}
            });

            const result = await converter.convert(body);

            expect(result).toEqual({
                order: {id: '123', items: [{sku: 'ABC', qty: 2}]},
                customer: {id: '456', name: 'John'}
            });
        });

        it('should parse JSON arrays', async () => {
            const converter = new JsonPayloadMessagingConverter<any[]>();
            const body = JSON.stringify([{id: 1}, {id: 2}]);

            const result = await converter.convert(body);

            expect(result).toEqual([{id: 1}, {id: 2}]);
        });
    });

    describe('converting JSON with class-transformer when targetClass provided', () => {
        it('should transform parsed JSON to class instance when targetClass provided', async () => {
            const converter = new JsonPayloadMessagingConverter<OrderEvent>(OrderEvent);
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
            expect(result.customerId).toBe('456');
            expect(result.amount).toBe(100);
        });

        it('should handle class transformation with missing optional fields', async () => {
            const converter = new JsonPayloadMessagingConverter<OrderEvent>(OrderEvent);
            const body = JSON.stringify({orderId: '123'});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
        });
    });

    describe('error handling for invalid JSON', () => {
        it('should throw error for invalid JSON syntax', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const invalidBody = '{ invalid json }';

            await expect(converter.convert(invalidBody)).rejects.toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for empty string', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const emptyBody = '';

            await expect(converter.convert(emptyBody)).rejects.toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for malformed JSON', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const malformedBody = '{"key": "value"';

            await expect(converter.convert(malformedBody)).rejects.toThrow('Failed to parse message body as JSON');
        });

        it('should throw error for non-JSON string', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const nonJsonBody = 'this is not json';

            await expect(converter.convert(nonJsonBody)).rejects.toThrow('Failed to parse message body as JSON');
        });
    });

    describe('handling of message attributes parameter', () => {
        it('should accept message attributes parameter', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});
            const attributes: SQSMessageAttributes = {
                'TraceId': {StringValue: 'trace-123', DataType: 'String'}
            };

            const result = await converter.convert(body, attributes);

            expect(result).toEqual({orderId: '123'});
        });

        it('should work without message attributes parameter', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});

            const result = await converter.convert(body);

            expect(result).toEqual({orderId: '123'});
        });

        it('should work with empty message attributes', async () => {
            const converter = new JsonPayloadMessagingConverter<any>();
            const body = JSON.stringify({orderId: '123'});
            const attributes: SQSMessageAttributes = {};

            const result = await converter.convert(body, attributes);

            expect(result).toEqual({orderId: '123'});
        });
    });
});
