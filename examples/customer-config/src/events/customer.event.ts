import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class CustomerEvent {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  action: string;

  @IsObject()
  data: Record<string, any>;
}
