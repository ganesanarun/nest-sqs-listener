import {IsArray, IsNumber, IsPositive, IsString, ValidateNested} from 'class-validator';
import {Type} from 'class-transformer';

/**
 * Order item within an order-created event.
 */
export class OrderItem {
    @IsString()
    productId: string;

    @IsNumber()
    @IsPositive()
    quantity: number;
}

/**
 * Order created event payload with validation decorators.
 *
 * This event represents an order that has been created and needs processing.
 * Used to demonstrate batch acknowledgement functionality - multiple instances
 * of this event will be processed and acknowledged in batches.
 */
export class OrderCreatedEvent {
    @IsString()
    orderId: string;

    @IsString()
    customerId: string;

    @IsNumber()
    @IsPositive()
    amount: number;

    @IsArray()
    @ValidateNested({each: true})
    @Type(() => OrderItem)
    items: OrderItem[];
}