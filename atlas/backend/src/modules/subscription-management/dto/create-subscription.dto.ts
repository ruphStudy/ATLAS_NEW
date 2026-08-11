import { IsString, IsNotEmpty, IsOptional, IsEnum, IsBoolean, IsInt, Min, IsObject } from 'class-validator';
import { SubscriptionScope, SubscriptionType, SubscriptionBillingCycle } from '../interfaces';

export class CreateSubscriptionDto {
  @IsEnum(SubscriptionScope)
  scope: SubscriptionScope;

  /** Required when scope is ORGANIZATION; also accepted for WORKSPACE to denormalize a known org — never validated against an Organization entity, which does not exist in this schema. */
  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsEnum(SubscriptionType)
  type: SubscriptionType;

  /** Opaque reference into the Plan Management catalog — never validated or interpreted here. */
  @IsString()
  @IsNotEmpty()
  planKey: string;

  @IsEnum(SubscriptionBillingCycle)
  billingCycle: SubscriptionBillingCycle;

  @IsInt()
  @IsOptional()
  @Min(1)
  customBillingCycleDays?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  trialDays?: number;

  @IsInt()
  @IsOptional()
  @Min(0)
  gracePeriodDays?: number;

  @IsBoolean()
  @IsOptional()
  autoRenew?: boolean;

  /** Bypasses the duplicate-active-subscription-per-scope guard. */
  @IsBoolean()
  @IsOptional()
  allowMultipleActive?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, unknown>;
}
