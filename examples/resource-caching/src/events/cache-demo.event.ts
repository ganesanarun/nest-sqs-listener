import { IsNotEmpty, IsString } from 'class-validator';

export class CacheDemoEvent {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsString()
  data: string;
}
