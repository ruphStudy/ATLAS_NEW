import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { QuotaResetSchedule } from '../interfaces';

export class UpdateQuotaPolicyDto {
  @IsString()
  @IsOptional()
  unit?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  softLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  hardLimit?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  graceThreshold?: number;

  @IsBoolean()
  @IsOptional()
  overageAllowed?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  overageLimit?: number;

  @IsEnum(QuotaResetSchedule)
  @IsOptional()
  resetSchedule?: QuotaResetSchedule;

  @IsInt()
  @IsOptional()
  @Min(1)
  customResetIntervalDays?: number;
}
