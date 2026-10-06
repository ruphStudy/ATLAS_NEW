import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  MarketplaceMetricType,
  MarketplacePeriod,
  MarketplaceDimension,
  MarketplacePerformanceCategory,
  MarketplaceComparisonType,
  AccountHealthStatus,
  IMarketplaceSalesMetrics,
  IMarketplaceProfitMetrics,
  IMarketplaceOperationsMetrics,
  IMarketplaceListingMetrics,
  IMarketplaceInventoryMetrics,
  IMarketplaceAccountHealth,
  IMarketplacePerformance,
  IMarketplaceTrend,
  IMarketplaceBreakdown,
  IMarketplaceComparison,
  IProductMarketplaceComparison,
} from '../interfaces';

export class GetMarketplacePerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(MarketplacePeriod)
  @IsOptional()
  period?: MarketplacePeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(MarketplacePerformanceCategory)
  @IsOptional()
  performanceCategory?: MarketplacePerformanceCategory;

  @IsNumber()
  @IsOptional()
  minOverallScore?: number;

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

export class GetMarketplaceTrendsDto extends GetMarketplacePerformanceDto {
  @IsString()
  @IsNotEmpty()
  marketplaceId!: string;

  @IsEnum(MarketplaceMetricType)
  @IsNotEmpty()
  metricType!: MarketplaceMetricType;

  @IsEnum(MarketplacePeriod)
  @IsNotEmpty()
  period!: MarketplacePeriod;
}

export class GetMarketplaceBreakdownDto extends GetMarketplacePerformanceDto {
  @IsEnum(MarketplaceDimension)
  @IsNotEmpty()
  dimension!: MarketplaceDimension;
}

export class GetMarketplaceComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  marketplaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(MarketplaceComparisonType)
  @IsNotEmpty()
  comparisonType!: MarketplaceComparisonType;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonStartDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  comparisonEndDate?: Date;

  @IsString()
  @IsOptional()
  comparisonMarketplaceId?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetProductMarketplaceComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  productId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(MarketplacePeriod)
  @IsOptional()
  period?: MarketplacePeriod;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class MarketplaceSalesMetricsResponseDto implements IMarketplaceSalesMetrics {
  revenue!: number;
  orders!: number;
  unitsSold!: number;
  averageOrderValue!: number;
  conversionRate!: number;
}

export class MarketplaceProfitMetricsResponseDto implements IMarketplaceProfitMetrics {
  grossProfit!: number;
  netProfit!: number;
  grossMargin!: number;
  netMargin!: number;
  roi!: number;
  marketplaceFees!: number;
  feePercent!: number;
}

export class MarketplaceOperationsMetricsResponseDto implements IMarketplaceOperationsMetrics {
  returnRate!: number;
  returnAmount!: number;
  cancellationRate!: number;
  cancellationAmount!: number;
  refundAmount!: number;
}

export class MarketplaceListingMetricsResponseDto implements IMarketplaceListingMetrics {
  totalListings!: number;
  activeListings!: number;
  inactiveListings!: number;
  averageListingQuality!: number;
  publicationSuccessRate!: number;
  publicationFailures!: number;
  syncHealthScore!: number;
}

export class MarketplaceInventoryMetricsResponseDto implements IMarketplaceInventoryMetrics {
  availabilityRate!: number;
  stockoutRate!: number;
  oversellingIncidents!: number;
  fulfillmentRate!: number;
  averageFulfillmentDays!: number;
}

export class MarketplaceAccountHealthResponseDto implements IMarketplaceAccountHealth {
  healthStatus!: AccountHealthStatus;
  apiHealthScore!: number;
  syncLatencyMs!: number;
  errorRate!: number;
  rateLimitHitCount!: number;
  lastSyncTimestamp!: Date;
  consecutiveFailures!: number;
}

export class MarketplacePerformanceResponseDto implements IMarketplacePerformance {
  workspaceId!: string;
  marketplaceId!: string;
  marketplaceName!: string;
  providerKey!: string;
  accountId?: string;
  country?: string;
  region?: string;
  performanceCategory!: MarketplacePerformanceCategory;
  salesMetrics!: IMarketplaceSalesMetrics;
  profitMetrics!: IMarketplaceProfitMetrics;
  operationsMetrics!: IMarketplaceOperationsMetrics;
  listingMetrics!: IMarketplaceListingMetrics;
  inventoryMetrics!: IMarketplaceInventoryMetrics;
  accountHealth!: IMarketplaceAccountHealth;
  overallScore!: number;
  rank?: number;
  period!: MarketplacePeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  metadata?: Record<string, any>;
}

export class MarketplaceTrendResponseDto implements IMarketplaceTrend {
  workspaceId!: string;
  marketplaceId!: string;
  marketplaceName!: string;
  period!: MarketplacePeriod;
  periodStart!: Date;
  periodEnd!: Date;
  metricType!: MarketplaceMetricType;
  value!: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export class MarketplaceBreakdownResponseDto implements IMarketplaceBreakdown {
  workspaceId!: string;
  dimension!: MarketplaceDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  period!: MarketplacePeriod;
  startDate!: Date;
  endDate!: Date;
  salesMetrics!: IMarketplaceSalesMetrics;
  profitMetrics!: IMarketplaceProfitMetrics;
  operationsMetrics!: IMarketplaceOperationsMetrics;
  overallScore!: number;
  rank?: number;
  currency!: string;
  metadata?: Record<string, any>;
}

export class MarketplaceComparisonResponseDto implements IMarketplaceComparison {
  workspaceId!: string;
  marketplaceId!: string;
  marketplaceName!: string;
  comparisonType!: MarketplaceComparisonType;
  actualMetrics!: {
    salesMetrics: IMarketplaceSalesMetrics;
    profitMetrics: IMarketplaceProfitMetrics;
    operationsMetrics: IMarketplaceOperationsMetrics;
  };
  comparisonMetrics!: {
    salesMetrics: IMarketplaceSalesMetrics;
    profitMetrics: IMarketplaceProfitMetrics;
    operationsMetrics: IMarketplaceOperationsMetrics;
  };
  variance!: {
    revenueAmount: number;
    revenuePercent: number;
    ordersAmount: number;
    ordersPercent: number;
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
  };
  period!: MarketplacePeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  metadata?: Record<string, any>;
}

export class ProductMarketplaceComparisonResponseDto implements IProductMarketplaceComparison {
  workspaceId!: string;
  productId!: string;
  sku!: string;
  productName!: string;
  marketplaces!: Array<{
    marketplaceId: string;
    marketplaceName: string;
    revenue: number;
    unitsSold: number;
    grossProfit: number;
    netProfit: number;
    grossMargin: number;
    netMargin: number;
    isActive: boolean;
    listingQuality: number;
    rank?: number;
  }>;
  recommendedMarketplaces!: string[];
  period!: MarketplacePeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  metadata?: Record<string, any>;
}
