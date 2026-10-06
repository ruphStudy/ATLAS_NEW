import { IsBoolean, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { FeatureFlagScopeType, IFeatureFlagTargetingRules } from '../interfaces';

export class CreateFeatureFlagOverrideDto {
  @IsEnum(FeatureFlagScopeType)
  scope!: FeatureFlagScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for PLAN scope — a `Plan.code`/`planKey`, not resolved from the caller's workspace. */
  @IsString()
  @IsOptional()
  planKey?: string;

  /** Required for ENVIRONMENT scope (e.g. 'production', 'staging'). */
  @IsString()
  @IsOptional()
  environment?: string;

  /** Required for USER scope — the target user this override applies to (distinct from the acting admin). */
  @IsString()
  @IsOptional()
  targetUserId?: string;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsInt()
  @IsOptional()
  @Min(0)
  @Max(100)
  rolloutPercentage?: number;

  @IsObject()
  @IsOptional()
  rules?: IFeatureFlagTargetingRules;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
