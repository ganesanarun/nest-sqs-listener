import { IsString, IsNumber, IsPositive, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderCreatedEvent {
    @IsUUID()
    orderId: string;

    @IsUUID()
    customerId: string;

    @IsNumber()
    @IsPositive()
    amount: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OrderItem)
    items: OrderItem[];
}

export class OrderItem {
    @IsString()
    productId: string;

    @IsNumber()
    @Min(1)
    quantity: number;
}
