import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { QuotaResetSchedule, QuotaScopeType } from '../interfaces';

export class CreateQuotaPolicyDto {
  @IsEnum(QuotaScopeType)
  scopeType: QuotaScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for USER scope. */
  @IsString()
  @IsOptional()
  ownerUserId?: string;

  /** Required for PLAN scope — a `Plan.code` (Plan Management), admin-selected. */
  @IsString()
  @IsOptional()
  planKey?: string;

  @IsString()
  @IsNotEmpty()
  resourceKey: string;

  @IsString()
  @IsOptional()
  feature?: string;

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
