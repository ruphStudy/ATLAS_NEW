import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  Min,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BillingCycle, BillingTriggerType } from '../interfaces';
import { AdditionalItemDto } from './additional-item.dto';
import { UsageOverageDto } from './usage-overage.dto';

export class GenerateBillingPeriodDto {
  @IsString()
  @IsOptional()
  subscriptionId?: string;

  @IsString()
  @IsOptional()
  organizationId?: string;

  @IsString()
  @IsOptional()
  planKey?: string;

  @IsEnum(BillingTriggerType)
  @IsOptional()
  triggerType?: BillingTriggerType;

  /** Defaults to the subscription's own billing cycle when `subscriptionId` is given. */
  @IsEnum(BillingCycle)
  @IsOptional()
  billingCycle?: BillingCycle;

  @IsNumber()
  @IsOptional()
  @Min(1)
  customCycleDays?: number;

  /** Defaults to the subscription's `currentPeriodStart`/`currentPeriodEnd` when `subscriptionId` is given; required otherwise (e.g. ONE_TIME charges). */
  @IsDateString()
  @IsOptional()
  periodStart?: string;

  @IsDateString()
  @IsOptional()
  periodEnd?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  /** Defaults to the resolved plan price's currency when `subscriptionId` is given. */
  @IsString()
  @IsOptional()
  @Matches(/^[A-Z]{3}$/, { message: 'currency must be a 3-letter ISO 4217 code' })
  currency?: string;

  /**
   * The full, un-prorated base charge for this period. Defaults to the
   * subscription's plan price for the resolved currency/cycle when
   * `subscriptionId` is given — pass explicitly to override for a
   * CUSTOM/ENTERPRISE negotiated price the plan catalog doesn't carry.
   * Proration/discount/credit/overage/tax are layered on top via
   * `additionalItems`/`usageOverages`.
   */
  @IsNumber()
  @IsOptional()
  @Min(0)
  baseAmount?: number;

  @IsString()
  @IsOptional()
  baseDescription?: string;

  /** Sub-range actually in effect for the base charge, if different from the full period (mid-cycle change/trial conversion) — triggers proration. */
  @IsDateString()
  @IsOptional()
  effectiveFrom?: string;

  @IsDateString()
  @IsOptional()
  effectiveTo?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalItemDto)
  @IsOptional()
  additionalItems?: AdditionalItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UsageOverageDto)
  @IsOptional()
  usageOverages?: UsageOverageDto[];

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  region?: string;

  /** A repeat call with the same key returns the previously generated period instead of creating a duplicate. */
  @IsString()
  @IsOptional()
  idempotencyKey?: string;
}
