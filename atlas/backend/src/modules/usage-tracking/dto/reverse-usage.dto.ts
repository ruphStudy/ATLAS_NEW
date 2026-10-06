import { IsNotEmpty, IsString } from 'class-validator';

export class ReverseUsageDto {
  @IsString()
  @IsNotEmpty()
  reason!: string;
}
