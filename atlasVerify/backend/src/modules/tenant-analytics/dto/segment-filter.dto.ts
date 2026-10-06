import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { TenantRiskLevel } from '../interfaces';

export class TenantSegmentFilterDto {
  @IsEnum(TenantRiskLevel)
  @IsOptional()
  riskLevel?: TenantRiskLevel;

  /** Matches tenants whose `segments` array contains this tag (e.g. 'AT_RISK', 'HIGH_VALUE') — open vocabulary, not enum-validated. */
  @IsString()
  @IsOptional()
  segment?: string;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  page?: number;

  @Type(() => Number)
  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(200)
  limit?: number;
}
