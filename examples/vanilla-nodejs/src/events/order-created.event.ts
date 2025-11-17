import {IsNumber, IsPositive, IsString} from 'class-validator';

/**
 * Event payload for order creation messages
 */
export class OrderCreatedEvent {
    @IsString()
    orderId!: string;

    @IsString()
    customerId!: string;

    @IsNumber()
    @IsPositive()
    amount!: number;

    @IsString()
    currency!: string;
}
