import { IsNotEmpty, IsNumber, IsPositive, IsString } from 'class-validator';

/**
 * Order created event payload.
 * Validated automatically by the message converter.
 */
export class OrderCreatedEvent {
  @IsString()
  @IsNotEmpty()
  orderId: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsNumber()
  @IsPositive()
  amount: number;
}
