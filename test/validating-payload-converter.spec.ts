import {ValidatingPayloadConverter} from '../src/converter/validating-payload-converter';
import {PayloadMessagingConverter} from '../src/converter/payload-messaging-converter.interface';
import {MessageValidationError} from '../src/converter/message-validation-error';
import {ValidationFailureMode} from '../src/types/validation-failure-mode.enum';
import {ValidationHandledError} from '../src/converter/validation-handled-error';
import {MessageContext} from '../src/listener/message-context.interface';
import {SQSMessageAttributes} from '../src/types/sqs-types';
import {Logger} from '@nestjs/common';
import {IsString, IsNumber, IsPositive, Min} from 'class-validator';

// Test classes with real class-validator decorators
class OrderEvent {
    @IsString()
    orderId!: string;

    @IsNumber()
    @IsPositive()
    @Min(1)
    amount!: number;
}

// Custom converter that returns plain objects
class CustomPlainObjectConverter implements PayloadMessagingConverter<OrderEvent> {
    async convert(body: string): Promise<OrderEvent> {
        // Simulates a custom converter (e.g., XML) that returns plain objects
        const parsed = JSON.parse(body);
        return {orderId: parsed.orderId, amount: parsed.amount} as OrderEvent;
    }
}

// Custom converter that returns class instances
class CustomClassConverter implements PayloadMessagingConverter<OrderEvent> {
    async convert(body: string): Promise<OrderEvent> {
        const parsed = JSON.parse(body);
        const instance = new OrderEvent();
        instance.orderId = parsed.orderId;
        instance.amount = parsed.amount;
        return instance;
    }
}

describe('ValidatingPayloadConverter', () => {
    let mockLogger: jest.Mocked<Logger>;
    let mockContext: jest.Mocked<MessageContext>;

    beforeEach(() => {
        mockLogger = {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
            verbose: jest.fn(),
        } as any;
        mockContext = {
            getMessageId: jest.fn().mockReturnValue('msg-123'),
            getReceiptHandle: jest.fn().mockReturnValue('receipt-123'),
            getQueueUrl: jest.fn().mockReturnValue('https://sqs.us-east-1.amazonaws.com/123/test'),
            getMessageAttributes: jest.fn().mockReturnValue({}),
            getSystemAttributes: jest.fn().mockReturnValue({}),
            getApproximateReceiveCount: jest.fn().mockReturnValue(1),
            acknowledge: jest.fn().mockResolvedValue(undefined),
        };
    });

    describe('Wrapping Custom Converter', () => {
        it('should wrap custom converter and delegate conversion', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
            expect(result.amount).toBe(100);
        });

        it('should call inner converter first before validation', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const convertSpy = jest.spyOn(customConverter, 'convert');
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            await validatingConverter.convert(body);

            expect(convertSpy).toHaveBeenCalledWith(body, undefined, undefined);
        });
    });

    describe('Validation with Custom Converter', () => {
        it('should validate payload from custom converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: -10});

            await expect(validatingConverter.convert(body)).rejects.toThrow(MessageValidationError);
        });

        it('should return validated payload when validation passes', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
        });
    });

    describe('Plain Object Transformation Before Validation', () => {
        it('should transform plain object to class instance before validation', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
        });

        it('should not transform if already a class instance', async () => {
            const customConverter = new CustomClassConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
        });
    });

    describe('Validation Failure Modes with Custom Converter', () => {
        it('should handle THROW mode with custom converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.THROW
                }
            );
            const body = JSON.stringify({orderId: 123, amount: 100});

            await expect(validatingConverter.convert(body)).rejects.toThrow(MessageValidationError);
        });

        it('should handle ACKNOWLEDGE mode with custom converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
                },
                mockLogger
            );
            const body = JSON.stringify({orderId: '123', amount: -10});

            await expect(validatingConverter.convert(body, {}, mockContext)).rejects.toThrow(ValidationHandledError);

            expect(mockContext.acknowledge).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });

        it('should handle REJECT mode with custom converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.REJECT
                },
                mockLogger
            );
            const body = JSON.stringify({orderId: '123', amount: -10});

            await expect(validatingConverter.convert(body, {}, mockContext)).rejects.toThrow(ValidationHandledError);

            expect(mockContext.acknowledge).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('Validation Disabled', () => {
        it('should skip validation when disabled', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: false}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeDefined();
        });

        it('should return result from inner converter when validation disabled', async () => {
            const customConverter = new CustomClassConverter();
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: false}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await validatingConverter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
        });
    });

    describe('Context and Attributes Passing', () => {
        it('should pass attributes to inner converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const convertSpy = jest.spyOn(customConverter, 'convert');
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});
            const attributes: SQSMessageAttributes = {
                'TraceId': {StringValue: 'trace-123', DataType: 'String'}
            };

            await validatingConverter.convert(body, attributes);

            expect(convertSpy).toHaveBeenCalledWith(body, attributes, undefined);
        });

        it('should pass context to inner converter', async () => {
            const customConverter = new CustomPlainObjectConverter();
            const convertSpy = jest.spyOn(customConverter, 'convert');
            const validatingConverter = new ValidatingPayloadConverter(
                customConverter,
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            await validatingConverter.convert(body, {}, mockContext);

            expect(convertSpy).toHaveBeenCalledWith(body, {}, mockContext);
        });
    });
});
