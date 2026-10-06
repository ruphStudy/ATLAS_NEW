import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsBoolean,
  IsObject,
} from 'class-validator';
import { AiUsageQuotaScope, AiUsageQuotaPeriod, AiUsageQuotaUnit } from '../interfaces';

export class CreateUsageQuotaDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(AiUsageQuotaScope)
  scope!: AiUsageQuotaScope;

  @IsEnum(AiUsageQuotaPeriod)
  period!: AiUsageQuotaPeriod;

  @IsEnum(AiUsageQuotaUnit)
  unit!: AiUsageQuotaUnit;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  feature?: string;

  @IsString()
  @IsOptional()
  projectId?: string;

  @IsInt()
  @Min(0)
  limitAmount!: number;

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
  createdBy?: string;
}
