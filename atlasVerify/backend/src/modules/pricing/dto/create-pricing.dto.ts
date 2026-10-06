import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsObject,
  IsPositive,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PricingStrategy } from '../interfaces';

export class CreatePricingConfigDto {
  @IsString()
  marketplaceKey!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(100)
  commissionPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  fulfilmentFeeFlat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  shippingFeeFlat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(100)
  paymentProcessingPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  packagingCostFlat?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(100)
  advertisingCostPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0) @Max(100)
  taxPct?: number;

  @IsOptional()
  @IsNumber()
  targetMarginPct?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  targetRoi?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  minProfitFlat?: number;

  @IsOptional()
  @IsNumber()
  minMarginPct?: number;

  @IsOptional()
  @IsNumber()
  marketplacePriceAdjustmentPct?: number;

  @IsOptional()
  @IsNumber()
  regionalPriceAdjustmentPct?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  currencyConversionRate?: number;

  @IsOptional()
  @IsObject()
  rules?: Record<string, unknown>;
}

export class UpdatePricingConfigDto extends CreatePricingConfigDto {}

export class CalculatePricingDto {
  @IsString()
  catalogProductId!: string;

  @IsString()
  marketplaceKey!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsEnum(PricingStrategy)
  strategy?: PricingStrategy;

  @IsOptional()
  @IsNumber()
  @Min(0)
  baseCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landedCost?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  procurementCost?: number;

  @IsOptional()
  @IsObject()
  feeOverrides?: Record<string, number>;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  manualOverridePrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  competitorPrice?: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  scheduledPrice?: number;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}

export class BulkCalculatePricingDto {
  @Type(() => CalculatePricingDto)
  items!: CalculatePricingDto[];

  @IsOptional()
  @IsEnum(PricingStrategy)
  defaultStrategy?: PricingStrategy;
}

export class SimulatePricingDto {
  @IsNumber()
  @Min(0.01)
  baseCost!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  landedCost?: number;

  @IsEnum(PricingStrategy)
  strategy!: PricingStrategy;

  @IsString()
  marketplaceKey!: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsObject()
  feeOverrides?: Record<string, number>;

  @IsOptional()
  @IsObject()
  thresholdOverrides?: Record<string, number>;
}

export class ApprovePricingDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ArchivePricingDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
