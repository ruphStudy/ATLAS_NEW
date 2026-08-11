import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class UpdateUsageQuotaDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  limitAmount?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  thresholdPercent?: number;

  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  warningThresholdPercent?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}
