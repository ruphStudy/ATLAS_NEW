import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class OverageRateDto {
  @IsString()
  @IsNotEmpty()
  resourceKey!: string;

  @IsNumber()
  rate!: number;

  @IsString()
  @IsOptional()
  unit?: string;
}
