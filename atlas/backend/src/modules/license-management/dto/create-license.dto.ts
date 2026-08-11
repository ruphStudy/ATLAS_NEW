import { IsArray, IsDateString, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { LicenseScopeType, LicenseType } from '../interfaces';

export class CreateLicenseDto {
  @IsEnum(LicenseScopeType)
  scopeType: LicenseScopeType;

  /** Required for ORGANIZATION scope. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  /** Required for USER scope. */
  @IsString()
  @IsOptional()
  ownerUserId?: string;

  /** Required for ENVIRONMENT scope (e.g. 'production'). */
  @IsString()
  @IsOptional()
  environment?: string;

  /** Required for DEPLOYMENT scope — a free-form customer-provided instance identifier. */
  @IsString()
  @IsOptional()
  deploymentId?: string;

  @IsEnum(LicenseType)
  type: LicenseType;

  /** `Plan.code` (Plan Management) this license's entitlements are sourced from. */
  @IsString()
  @IsNotEmpty()
  planKey: string;

  /** `Subscription.id` (Subscription Management), if this license is tied to a billed subscription rather than issued standalone (e.g. TRIAL/INTERNAL). */
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  featureFlagKeys?: string[];

  @IsInt()
  @IsOptional()
  @Min(1)
  maxActivations?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;

  @IsString()
  @IsOptional()
  externalReference?: string;
}
