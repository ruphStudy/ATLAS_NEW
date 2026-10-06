import { IsString, IsNotEmpty, IsOptional, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { AiUsageQuotaScope, AiUsageQuotaPeriod, AiUsageQuotaUnit } from '../interfaces';

export class QuotaFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiUsageQuotaScope)
  @IsOptional()
  scope?: AiUsageQuotaScope;

  @IsEnum(AiUsageQuotaPeriod)
  @IsOptional()
  period?: AiUsageQuotaPeriod;

  @IsEnum(AiUsageQuotaUnit)
  @IsOptional()
  unit?: AiUsageQuotaUnit;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(100)
  limit?: number;
}
