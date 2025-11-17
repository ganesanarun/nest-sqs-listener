import {IsNumber, IsPositive, IsString} from 'class-validator';

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
