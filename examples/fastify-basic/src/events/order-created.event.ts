import {IsArray, IsNumber, IsPositive, IsString, Min, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

/**
 * Order Created Event
 *
 * Represents an order creation message with validation decorators.
 * This class demonstrates how to use class-validator decorators
 * for automatic message validation in the SQS listener.
 */
export class OrderCreatedEvent {
    @IsString()
    orderId!: string;

    @IsString()
    customerId!: string;

    @IsNumber()
    @IsPositive()
    amount!: number;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items!: OrderItem[];
}

/**
 * Order Item
 *
 * Represents an individual item within an order.
 */
export class OrderItem {
    @IsString()
    productId!: string;

    @IsNumber()
    @Min(1)
    quantity!: number;

    @IsNumber()
    @IsPositive()
    price!: number;
}