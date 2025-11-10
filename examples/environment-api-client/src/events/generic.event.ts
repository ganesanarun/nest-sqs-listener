import { IsNotEmpty, IsObject, IsString } from 'class-validator';

/**
 * Generic event payload.
 */
export class GenericEvent {
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  data: Record<string, any>;
}
