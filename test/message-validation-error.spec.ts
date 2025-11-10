import 'reflect-metadata';
import {MessageValidationError} from '../src/converter/message-validation-error';
import {IsString, IsNumber, IsPositive, IsEmail, IsNotEmpty, MaxLength, Min, ValidateNested, IsArray, ArrayNotEmpty, validate, ValidationError} from 'class-validator';
import {Type} from 'class-transformer';

// Test classes with real class-validator decorators
class OrderItem {
    @IsString()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;
}

class OrderEvent {
    @IsString()
    orderId!: string;

    @IsNumber()
    @IsPositive()
    amount!: number;

    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items!: OrderItem[];
}

class UserEvent {
    @IsEmail()
    @IsNotEmpty()
    @MaxLength(100)
    email!: string;

    @IsString()
    name!: string;
}

// Test classes for optional array validation (empty array allowed, but items must be valid if present)
class LineItem {
    @IsString()
    sku!: string;

    @IsNumber()
    @IsPositive()
    price!: number;
}

class Invoice {
    @IsString()
    invoiceId!: string;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => LineItem)
    lineItems!: LineItem[];  // Empty array is allowed, but if items exist, they must be valid
}

describe('MessageValidationError', () => {
    describe('Error Construction', () => {
        it('should create error with all properties using real validation errors', async () => {
            // Create invalid object
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: 100,
                items: []
            });

            // Generate real validation errors
            const validationErrors = await validate(invalidOrder);
            const originalBody = '{"orderId": 123}';
            const targetClass = 'OrderEvent';
            const message = 'Validation failed';

            const error = new MessageValidationError(
                message,
                validationErrors,
                originalBody,
                targetClass
            );

            expect(error).toBeInstanceOf(Error);
            expect(error).toBeInstanceOf(MessageValidationError);
            expect(error.message).toBe(message);
            expect(error.validationErrors).toBe(validationErrors);
            expect(error.originalBody).toBe(originalBody);
            expect(error.targetClass).toBe(targetClass);
            expect(error.name).toBe('MessageValidationError');
        });

        it('should have proper error name', () => {
            const error = new MessageValidationError(
                'Test error',
                [],
                '{}',
                'TestClass'
            );

            const result = error.name;

            expect(result).toBe('MessageValidationError');
        });

        it('should maintain stack trace', () => {
            const error = new MessageValidationError(
                'Test error',
                [],
                '{}',
                'TestClass'
            );

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('MessageValidationError');
        });
    });

    describe('getConstraints Method', () => {
        it('should extract constraints from single validation error using real class-validator', async () => {
            // Create invalid object with wrong type
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: 100,
                items: []
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();
            expect(constraints.length).toBeGreaterThan(0);
            const orderIdConstraint = constraints.find(c => c.property === 'orderId');
            expect(orderIdConstraint).toBeDefined();
            expect(orderIdConstraint!.constraints.length).toBeGreaterThan(0);
            expect(orderIdConstraint!.constraints[0]).toEqual('orderId must be a string');
        });

        it('should extract constraints from multiple validation errors using real class-validator', async () => {
            // Create invalid object with multiple errors
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: -50, // should be positive
                items: []
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();
            expect(constraints.length).toBeGreaterThanOrEqual(2);
        
            const orderIdConstraint = constraints.find(c => c.property === 'orderId');
            expect(orderIdConstraint).toBeDefined();
            expect(orderIdConstraint!.constraints[0]).toContain('must be a string');
            const amountConstraint = constraints.find(c => c.property === 'amount');
            expect(amountConstraint).toBeDefined();
            expect(amountConstraint!.constraints[0]).toEqual('amount must be a positive number');
        });

        it('should handle empty validation errors array', () => {
            const error = new MessageValidationError(
                'Validation failed',
                [],
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();

            expect(constraints).toHaveLength(0);
        });

        it('should handle multiple constraints on same property using real class-validator', async () => {
            // Create invalid email with multiple constraint violations
            const invalidUser = Object.assign(new UserEvent(), {
                email: '', // violates IsNotEmpty, IsEmail, and potentially MaxLength
                name: 'John'
            });

            const validationErrors = await validate(invalidUser);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'UserEvent'
            );

            const constraints = error.getConstraints();
            const emailConstraint = constraints.find(c => c.property === 'email');
            expect(emailConstraint).toBeDefined();
            expect(emailConstraint!.constraints.length).toBeGreaterThanOrEqual(2);
            // Check that multiple constraint messages are present
            const allConstraints = emailConstraint!.constraints.join(' ');
            expect(allConstraints).toContain('email');
        });

        it('should handle nested object validation errors using real class-validator', async () => {
            // Create order with invalid nested item
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 'order-123',
                amount: 100,
                items: [
                    Object.assign(new OrderItem(), {
                        productId: 123, // should be string
                        quantity: 0 // should be >= 1
                    })
                ]
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();
            // Should have nested errors for items[0].productId and items[0].quantity
            const nestedConstraints = constraints.filter(c => c.property.startsWith('items'));
            expect(nestedConstraints.length).toBeGreaterThan(0);
            // Check for productId error
            const productIdError = constraints.find(c => c.property.includes('productId'));
            expect(productIdError).toBeDefined();
            expect(productIdError!.constraints[0]).toEqual('productId must be a string');
            // Check for quantity error
            const quantityError = constraints.find(c => c.property.includes('quantity'));
            expect(quantityError).toBeDefined();
            expect(quantityError!.constraints[0]).toEqual('quantity must not be less than 1');
        });

        it('should handle array validation errors using real class-validator', async () => {
            // Create order with multiple invalid items
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 'order-123',
                amount: 100,
                items: [
                    Object.assign(new OrderItem(), {
                        productId: 'prod-1',
                        quantity: -5 // invalid
                    }),
                    Object.assign(new OrderItem(), {
                        productId: 456, // invalid
                        quantity: 2
                    })
                ]
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();

            // Should have errors for both array items
            const item0Errors = constraints.filter(c => c.property.includes('items.0'));
            const item1Errors = constraints.filter(c => c.property.includes('items.1'));
            expect(item0Errors.length).toBeGreaterThan(0);
            expect(item1Errors.length).toBeGreaterThan(0);
        });

        it('should validate that items array is not empty using real class-validator', async () => {
            // Create order with empty items array
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 'order-123',
                amount: 100,
                items: [] // should not be empty
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const constraints = error.getConstraints();
            // Should have error for empty items array
            const itemsConstraint = constraints.find(c => c.property === 'items');
            expect(itemsConstraint).toBeDefined();
            expect(itemsConstraint!.constraints.length).toBeGreaterThan(0);
            expect(itemsConstraint!.constraints[0]).toContain('should not be empty');
        });
    });

    describe('getFormattedErrors Method', () => {
        it('should format single validation error using real class-validator', async () => {
            // Create invalid object
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: 100,
                items: []
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const formatted = error.getFormattedErrors();

            expect(formatted).toContain('  - orderId:');
            expect(formatted).toContain('must be a string');
        });

        it('should format multiple validation errors using real class-validator', async () => {
            // Create invalid object with multiple errors
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: -50, // should be positive
                items: []
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const formatted = error.getFormattedErrors();

            expect(formatted).toContain('  - orderId:');
            expect(formatted).toContain('must be a string');
            expect(formatted).toContain('  - amount:');
            expect(formatted).toContain('must be a positive number');
            expect(formatted.split('\n').length).toBeGreaterThanOrEqual(2);
        });

        it('should format error with multiple constraints on same property using real class-validator', async () => {
            // Create invalid email with multiple constraint violations
            const invalidUser = Object.assign(new UserEvent(), {
                email: '', // violates IsNotEmpty and IsEmail
                name: 'John'
            });

            const validationErrors = await validate(invalidUser);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'UserEvent'
            );

            const formatted = error.getFormattedErrors();

            expect(formatted).toContain('  - email:');
            // Should contain multiple constraint messages joined by comma
            const emailLine = formatted.split('\n').find(line => line.includes('email'));
            expect(emailLine).toBeDefined();
            expect(emailLine).toContain('email');
        });

        it('should handle empty validation errors array', () => {
            const error = new MessageValidationError(
                'Validation failed',
                [],
                '{}',
                'OrderEvent'
            );

            const formatted = error.getFormattedErrors();

            expect(formatted).toBe('');
        });

        it('should format nested property errors using real class-validator', async () => {
            // Create order with invalid nested item
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 'order-123',
                amount: 100,
                items: [
                    Object.assign(new OrderItem(), {
                        productId: 'prod-1',
                        quantity: 0 // should be >= 1
                    })
                ]
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const formatted = error.getFormattedErrors();
            // Should contain nested property path
            expect(formatted).toContain('items');
            expect(formatted).toContain('quantity');
            expect(formatted).toContain('must not be less than');
        });

        it('should format array validation errors using real class-validator', async () => {
            // Create order with multiple invalid items
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 'order-123',
                amount: 100,
                items: [
                    Object.assign(new OrderItem(), {
                        productId: 'prod-1',
                        quantity: -5 // invalid
                    }),
                    Object.assign(new OrderItem(), {
                        productId: 456, // invalid
                        quantity: 2
                    })
                ]
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            const formatted = error.getFormattedErrors();
            // Should contain errors for both array items
            expect(formatted).toContain('items');
            const lines = formatted.split('\n');
            const itemErrors = lines.filter(line => line.includes('items'));
            expect(itemErrors.length).toBeGreaterThan(1);
        });
    });

    describe('Error Message and Context', () => {
        it('should preserve original message body', () => {
            const originalBody = '{"orderId": 123, "amount": -50}';

            const error = new MessageValidationError(
                'Validation failed',
                [],
                originalBody,
                'OrderEvent'
            );

            expect(error.originalBody).toBe(originalBody);
        });

        it('should preserve target class name', () => {
            const error = new MessageValidationError(
                'Validation failed',
                [],
                '{}',
                'OrderCreatedEvent'
            );

            const result = error.targetClass;

            expect(result).toBe('OrderCreatedEvent');
        });

        it('should preserve validation errors array using real class-validator', async () => {
            // Create invalid object
            const invalidOrder = Object.assign(new OrderEvent(), {
                orderId: 123, // should be string
                amount: -50, // should be positive
                items: []
            });

            const validationErrors = await validate(invalidOrder);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'OrderEvent'
            );

            expect(error.validationErrors).toBe(validationErrors);
            expect(error.validationErrors.length).toBeGreaterThanOrEqual(2);
        });
    });

    describe('Optional Array Validation (Empty Array Allowed)', () => {
        it('should allow empty array when no @ArrayNotEmpty decorator is present', async () => {
            // Create invoice with empty lineItems array - should be valid
            const validInvoice = Object.assign(new Invoice(), {
                invoiceId: 'INV-001',
                lineItems: [] // Empty array is allowed
            });

            const validationErrors = await validate(validInvoice);

            // Should have no validation errors
            expect(validationErrors).toHaveLength(0);
        });

        it('should validate items when array is not empty', async () => {
            // Create invoice with invalid line items
            const invalidInvoice = Object.assign(new Invoice(), {
                invoiceId: 'INV-001',
                lineItems: [
                    Object.assign(new LineItem(), {
                        sku: 123, // should be string
                        price: -10 // should be positive
                    })
                ]
            });

            const validationErrors = await validate(invalidInvoice);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'Invoice'
            );

            const constraints = error.getConstraints();

            // Should have errors for the invalid line item
            expect(constraints.length).toBeGreaterThan(0);
            
            const skuError = constraints.find(c => c.property.includes('sku'));
            expect(skuError).toBeDefined();
            expect(skuError!.constraints[0]).toContain('must be a string');
            
            const priceError = constraints.find(c => c.property.includes('price'));
            expect(priceError).toBeDefined();
            expect(priceError!.constraints[0]).toContain('must be a positive number');
        });

        it('should pass validation when array has valid items', async () => {
            // Create invoice with valid line items
            const validInvoice = Object.assign(new Invoice(), {
                invoiceId: 'INV-001',
                lineItems: [
                    Object.assign(new LineItem(), {
                        sku: 'SKU-123',
                        price: 99.99
                    }),
                    Object.assign(new LineItem(), {
                        sku: 'SKU-456',
                        price: 49.99
                    })
                ]
            });

            const validationErrors = await validate(validInvoice);

            // Should have no validation errors
            expect(validationErrors).toHaveLength(0);
        });

        it('should format errors for optional array with invalid items', async () => {
            // Create invoice with multiple invalid line items
            const invalidInvoice = Object.assign(new Invoice(), {
                invoiceId: 'INV-001',
                lineItems: [
                    Object.assign(new LineItem(), {
                        sku: 'SKU-123',
                        price: -10 // invalid
                    }),
                    Object.assign(new LineItem(), {
                        sku: 999, // invalid
                        price: 50
                    })
                ]
            });

            const validationErrors = await validate(invalidInvoice);
            const error = new MessageValidationError(
                'Validation failed',
                validationErrors,
                '{}',
                'Invoice'
            );

            const formatted = error.getFormattedErrors();

            // Should contain errors for both line items
            expect(formatted).toContain('lineItems');
            const lines = formatted.split('\n');
            const itemErrors = lines.filter(line => line.includes('lineItems'));
            expect(itemErrors.length).toBeGreaterThan(1);
        });
    });
});
