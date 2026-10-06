import { IsDateString, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateQuotaOverrideDto {
  @IsNumber()
  @IsOptional()
  additionalHardLimit?: number;

  @IsString()
  @IsNotEmpty()
  reason!: string;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
