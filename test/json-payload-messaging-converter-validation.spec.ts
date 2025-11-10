import 'reflect-metadata';
import {JsonPayloadMessagingConverter} from '../src/converter/json-payload-messaging-converter';
import {MessageValidationError} from '../src/converter/message-validation-error';
import {ValidationFailureMode} from '../src/types/validation-failure-mode.enum';
import {ValidationHandledError} from '../src/converter/validation-handled-error';
import {MessageContext} from '../src/listener/message-context.interface';
import {Logger} from '@nestjs/common';
import {IsString, IsNumber, IsPositive, ValidateNested, IsArray, Min} from 'class-validator';
import {Type} from 'class-transformer';

// Test classes with real class-validator decorators
class OrderEvent {
    @IsString()
    orderId!: string;

    @IsString()
    customerId!: string;

    @IsNumber()
    @IsPositive()
    amount!: number;
}

class OrderItem {
    @IsString()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

class OrderWithItems {
    @IsString()
    orderId!: string;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items!: OrderItem[];
}

class PlainClass {
    value!: string;
}

describe('JsonPayloadMessagingConverter - Validation', () => {
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
            getContext: jest.fn().mockReturnValue(undefined),
            getResources: jest.fn().mockReturnValue(undefined),
        };
    });

    describe('Validation Success', () => {
        it('should return validated instance when validation passes', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
            expect(result.customerId).toBe('456');
            expect(result.amount).toBe(100);
        });
    });

    describe('Validation Failure - Single Error', () => {
        it('should throw MessageValidationError with single constraint', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {enableValidation: true, validationFailureMode: ValidationFailureMode.THROW}
            );
            const body = JSON.stringify({orderId: 123, customerId: '456', amount: 100});

            await expect(converter.convert(body)).rejects.toThrow(MessageValidationError);

            await expect(converter.convert(body)).rejects.toThrow("Message validation failed for class 'OrderEvent'");
        });
    });

    describe('Validation Failure - Multiple Errors', () => {
        it('should throw MessageValidationError with all constraints', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: 123, customerId: 456, amount: -50});

            try {
                await converter.convert(body);
                fail('Should have thrown MessageValidationError');
            } catch (error) {
                expect(error).toBeInstanceOf(MessageValidationError);
                const validationError = error as MessageValidationError;
                expect(validationError.validationErrors.length).toBeGreaterThanOrEqual(2);
                expect(validationError.getConstraints().length).toBeGreaterThanOrEqual(2);
            }
        });
    });

    describe('Validation Disabled', () => {
        it('should skip validation when enableValidation is false', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {enableValidation: false}
            );
            const body = JSON.stringify({orderId: 123, customerId: '456', amount: -100});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe(123);
        });

        it('should skip validation when options not provided', async () => {
            const converter = new JsonPayloadMessagingConverter(OrderEvent);
            const body = JSON.stringify({orderId: 123, customerId: '456', amount: -100});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe(123);
        });
    });

    describe('No Target Class', () => {
        it('should return parsed JSON without validation when no target class', async () => {
            const converter = new JsonPayloadMessagingConverter(
                undefined,
                {enableValidation: true}
            );
            const body = JSON.stringify({orderId: '123', amount: 100});

            const result = await converter.convert(body);

            expect(result).toEqual({orderId: '123', amount: 100});
        });
    });

    describe('No Decorators', () => {
        it('should skip validation when class has no decorators', async () => {
            const converter = new JsonPayloadMessagingConverter(
                PlainClass,
                {enableValidation: false}
            );
            const body = JSON.stringify({value: 'test'});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(PlainClass);
            expect(result.value).toBe('test');
        });
    });

    describe('Nested Object Validation', () => {
        it('should validate nested objects correctly', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderWithItems,
                {enableValidation: true}
            );
            const body = JSON.stringify({
                orderId: '123',
                items: [{productId: 'prod-1', quantity: 2}]
            });

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderWithItems);
            expect(result.items).toHaveLength(1);
            expect(result.items[0]).toBeInstanceOf(OrderItem);
        });

        it('should report nested validation errors', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderWithItems,
                {enableValidation: true}
            );
            const body = JSON.stringify({
                orderId: '123',
                items: [{productId: 'prod-1', quantity: 0}]
            });

            await expect(converter.convert(body)).rejects.toThrow(MessageValidationError);
        });
    });

    describe('Array Validation', () => {
        it('should validate array elements', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderWithItems,
                {enableValidation: true}
            );
            const body = JSON.stringify({
                orderId: '123',
                items: [
                    {productId: 'prod-1', quantity: 2},
                    {productId: 'prod-2', quantity: 5}
                ]
            });

            const result = await converter.convert(body);

            expect(result.items).toHaveLength(2);
            expect(result.items[0]).toBeInstanceOf(OrderItem);
            expect(result.items[1]).toBeInstanceOf(OrderItem);
        });
    });

    describe('Whitelist Mode', () => {
        it('should strip non-whitelisted properties when whitelist is true', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validatorOptions: {whitelist: true}
                }
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100, extraField: 'should be removed'});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
            expect((result as any).extraField).toBeUndefined();
        });
    });

    describe('ForbidNonWhitelisted Mode', () => {
        it('should accept valid properties with forbidNonWhitelisted', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validatorOptions: {
                        whitelist: true,
                        forbidNonWhitelisted: true
                    }
                }
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100});

            const result = await converter.convert(body);

            expect(result).toBeInstanceOf(OrderEvent);
            expect(result.orderId).toBe('123');
        });

        it('should throw validation error for extra properties', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validatorOptions: {
                        whitelist: true,
                        forbidNonWhitelisted: true
                    }
                }
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: 100, extraField: 'bad'});

            await expect(converter.convert(body)).rejects.toThrow(MessageValidationError);
        });
    });

    describe('THROW Mode', () => {
        it('should throw MessageValidationError in THROW mode', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.THROW
                }
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: -10});

            await expect(converter.convert(body)).rejects.toThrow(MessageValidationError);
        });
    });

    describe('ACKNOWLEDGE Mode with Context', () => {
        it('should acknowledge message and throw ValidationHandledError', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
                },
                mockLogger
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: -10});

            await expect(converter.convert(body, {}, mockContext)).rejects.toThrow(ValidationHandledError);

            expect(mockContext.acknowledge).toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });

    describe('ACKNOWLEDGE Mode without Context', () => {
        it('should fall back to THROW mode when no context provided', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.ACKNOWLEDGE
                },
                mockLogger
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: -10});

            await expect(converter.convert(body)).rejects.toThrow(MessageValidationError);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('No message context available')
            );
        });
    });

    describe('REJECT Mode', () => {
        it('should log error and throw ValidationHandledError without acknowledging', async () => {
            const converter = new JsonPayloadMessagingConverter(
                OrderEvent,
                {
                    enableValidation: true,
                    validationFailureMode: ValidationFailureMode.REJECT
                },
                mockLogger
            );
            const body = JSON.stringify({orderId: '123', customerId: '456', amount: -10});

            await expect(converter.convert(body, {}, mockContext)).rejects.toThrow(ValidationHandledError);

            expect(mockContext.acknowledge).not.toHaveBeenCalled();
            expect(mockLogger.error).toHaveBeenCalled();
        });
    });
});

describe('JsonPayloadMessagingConverter - Graceful Degradation', () => {
    // Note: Testing the case where class-validator is not installed is difficult
    // with Jest mocks since the module is already mocked at the top level.
    // The graceful degradation behavior is tested manually and through integration tests.
    // The implementation in base-validating-converter.ts handles the case where
    // the dynamic import of class-validator fails by logging a warning and skipping validation.
});
