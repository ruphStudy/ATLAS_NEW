import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProfitMetricType,
  ProfitPeriod,
  ProfitDimension,
  ProfitComparisonType,
  ProfitabilityCategory,
  LeakageType,
  IProfitComponents,
  IProfitSummary,
  IProfitTrend,
  IProfitBreakdown,
  IProfitComparison,
  IProfitabilityAnalysis,
  IProfitLeakage,
  IProfitTarget,
  IProfitTargetPerformance,
} from '../interfaces';

export class GetProfitSummaryDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(ProfitPeriod)
  @IsOptional()
  period?: ProfitPeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  skus?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  brands?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supplierIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetProfitTrendsDto extends GetProfitSummaryDto {
  @IsEnum(ProfitMetricType)
  @IsNotEmpty()
  metricType!: ProfitMetricType;

  @IsEnum(ProfitPeriod)
  @IsNotEmpty()
  period!: ProfitPeriod;
}

export class GetProfitBreakdownDto extends GetProfitSummaryDto {
  @IsEnum(ProfitDimension)
  @IsNotEmpty()
  dimension!: ProfitDimension;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsString()
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class GetProfitComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  currentStartDate!: Date;

  @IsDate()
  @Type(() => Date)
  currentEndDate!: Date;

  @IsEnum(ProfitComparisonType)
  @IsNotEmpty()
  comparisonType!: ProfitComparisonType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonStartDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonEndDate?: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetProfitabilityAnalysisDto extends GetProfitSummaryDto {
  @IsEnum(ProfitabilityCategory)
  @IsNotEmpty()
  profitabilityCategory!: ProfitabilityCategory;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetProfitLeakageDto extends GetProfitSummaryDto {
  @IsEnum(LeakageType)
  @IsOptional()
  leakageType?: LeakageType;

  @IsEnum(ProfitDimension)
  @IsOptional()
  dimension?: ProfitDimension;

  @IsNumber()
  @IsOptional()
  minImpactAmount?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CreateProfitTargetDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  targetKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(ProfitMetricType)
  @IsNotEmpty()
  metricType!: ProfitMetricType;

  @IsNumber()
  @IsNotEmpty()
  targetValue!: number;

  @IsEnum(ProfitPeriod)
  @IsNotEmpty()
  period!: ProfitPeriod;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsNotEmpty()
  createdBy!: string;
}

export class UpdateProfitTargetDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsOptional()
  dimensions?: Record<string, any>;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class ProfitComponentsResponseDto implements IProfitComponents {
  revenue!: number;
  grossSales!: number;
  netSales!: number;
  productCost!: number;
  landedCost!: number;
  marketplaceFees!: number;
  fulfillmentFees!: number;
  shippingCost!: number;
  taxAmount!: number;
  advertisingCost!: number;
  discounts!: number;
  returns!: number;
  refunds!: number;
  otherCosts!: number;
}

export class ProfitSummaryResponseDto implements IProfitSummary {
  workspaceId!: string;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  components!: IProfitComponents;
  grossProfit!: number;
  netProfit!: number;
  grossMargin!: number;
  netMargin!: number;
  roi!: number;
  contributionMargin!: number;
  profitPerUnit!: number;
  profitPerOrder!: number;
  unitsSold!: number;
  orderCount!: number;
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProfitTrendResponseDto implements IProfitTrend {
  workspaceId!: string;
  period!: ProfitPeriod;
  periodStart!: Date;
  periodEnd!: Date;
  metricType!: ProfitMetricType;
  value!: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export class ProfitBreakdownResponseDto implements IProfitBreakdown {
  workspaceId!: string;
  dimension!: ProfitDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  components!: IProfitComponents;
  grossProfit!: number;
  netProfit!: number;
  grossMargin!: number;
  netMargin!: number;
  roi!: number;
  contributionMargin!: number;
  sharePercent?: number;
  rank?: number;
  unitsSold!: number;
  orderCount!: number;
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProfitComparisonResponseDto implements IProfitComparison {
  workspaceId!: string;
  comparisonType!: ProfitComparisonType;
  currentPeriod!: {
    startDate: Date;
    endDate: Date;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    roi: number;
    contributionMargin: number;
    revenue: number;
  };
  comparisonPeriod!: {
    startDate: Date;
    endDate: Date;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    roi: number;
    contributionMargin: number;
    revenue: number;
  };
  variance!: {
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
    roiPoints: number;
    contributionMarginPoints: number;
    revenueAmount: number;
    revenuePercent: number;
  };
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProfitabilityAnalysisResponseDto implements IProfitabilityAnalysis {
  workspaceId!: string;
  productId!: string;
  sku!: string;
  productName!: string;
  category?: string;
  supplier?: string;
  marketplace?: string;
  profitabilityCategory!: ProfitabilityCategory;
  grossProfit!: number;
  netProfit!: number;
  grossMargin!: number;
  netMargin!: number;
  roi!: number;
  revenue!: number;
  totalCost!: number;
  unitsSold!: number;
  orderCount!: number;
  profitPerUnit!: number;
  profitShare!: number;
  rank?: number;
  currency!: string;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  metadata?: Record<string, any>;
}

export class ProfitLeakageResponseDto implements IProfitLeakage {
  workspaceId!: string;
  leakageType!: LeakageType;
  dimension!: ProfitDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  leakageAmount!: number;
  leakagePercent!: number;
  expectedAmount!: number;
  actualAmount!: number;
  impactOnProfit!: number;
  impactOnMargin!: number;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProfitTargetResponseDto implements IProfitTarget {
  id!: string;
  workspaceId!: string;
  targetKey!: string;
  name!: string;
  metricType!: ProfitMetricType;
  targetValue!: number;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  dimensions?: Record<string, any>;
  currency?: string;
  createdBy!: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ProfitTargetPerformanceResponseDto implements IProfitTargetPerformance {
  targetId!: string;
  workspaceId!: string;
  targetKey!: string;
  name!: string;
  metricType!: ProfitMetricType;
  targetValue!: number;
  actualValue!: number;
  variance!: number;
  variancePercent!: number;
  achievementPercent!: number;
  period!: ProfitPeriod;
  startDate!: Date;
  endDate!: Date;
  currency?: string;
}
