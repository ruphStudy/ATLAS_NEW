import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProductMetricType,
  ProductPeriod,
  ProductDimension,
  ProductPerformanceCategory,
  ProductLifecycleStage,
  ProductComparisonType,
  ListingQualityScore,
  PriceCompetitiveness,
  StockAvailability,
  IProductPerformanceMetrics,
  IProductPerformance,
  IProductTrend,
  IProductBreakdown,
  IProductComparison,
  IProductCohort,
  IListingPerformance,
  IMarketplacePerformance,
} from '../interfaces';

export class GetProductPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(ProductPeriod)
  @IsOptional()
  period?: ProductPeriod;

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
  variantIds?: string[];

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
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(ProductPerformanceCategory)
  @IsOptional()
  performanceCategory?: ProductPerformanceCategory;

  @IsEnum(ProductLifecycleStage)
  @IsOptional()
  lifecycleStage?: ProductLifecycleStage;

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

export class GetProductTrendsDto extends GetProductPerformanceDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsEnum(ProductMetricType)
  @IsNotEmpty()
  metricType: ProductMetricType;

  @IsEnum(ProductPeriod)
  @IsNotEmpty()
  period: ProductPeriod;
}

export class GetProductBreakdownDto extends GetProductPerformanceDto {
  @IsEnum(ProductDimension)
  @IsNotEmpty()
  dimension: ProductDimension;
}

export class GetProductComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(ProductComparisonType)
  @IsNotEmpty()
  comparisonType: ProductComparisonType;

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
  currency?: string;
}

export class GetProductCohortDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  launchDateStart: Date;

  @IsDate()
  @Type(() => Date)
  launchDateEnd: Date;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(ProductPeriod)
  @IsOptional()
  period?: ProductPeriod;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetListingPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  accountIds?: string[];

  @IsEnum(ListingQualityScore)
  @IsOptional()
  minQuality?: ListingQualityScore;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetMarketplacePerformanceDto extends GetProductPerformanceDto {
  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  sku?: string;
}

export class ProductPerformanceMetricsResponseDto implements IProductPerformanceMetrics {
  revenue: number;
  unitsSold: number;
  orders: number;
  grossProfit: number;
  netProfit: number;
  grossMargin: number;
  netMargin: number;
  roi: number;
  conversionRate: number;
  returnRate: number;
  growthRate: number;
  averageSellingPrice: number;
  views: number;
}

export class ProductPerformanceResponseDto implements IProductPerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  variantId?: string;
  productName: string;
  category?: string;
  brand?: string;
  performanceCategory: ProductPerformanceCategory;
  lifecycleStage: ProductLifecycleStage;
  metrics: IProductPerformanceMetrics;
  rank?: number;
  sharePercent?: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export class ProductTrendResponseDto implements IProductTrend {
  workspaceId: string;
  productId: string;
  sku: string;
  period: ProductPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: ProductMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export class ProductBreakdownResponseDto implements IProductBreakdown {
  workspaceId: string;
  dimension: ProductDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  metrics: IProductPerformanceMetrics;
  rank?: number;
  sharePercent?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export class ProductComparisonResponseDto implements IProductComparison {
  workspaceId: string;
  productId: string;
  sku: string;
  comparisonType: ProductComparisonType;
  actualMetrics: IProductPerformanceMetrics;
  comparisonMetrics: IProductPerformanceMetrics;
  variance: {
    revenueAmount: number;
    revenuePercent: number;
    unitsSoldAmount: number;
    unitsSoldPercent: number;
    grossProfitAmount: number;
    grossProfitPercent: number;
    netProfitAmount: number;
    netProfitPercent: number;
    grossMarginPoints: number;
    netMarginPoints: number;
  };
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export class ProductCohortResponseDto implements IProductCohort {
  workspaceId: string;
  cohortKey: string;
  cohortName: string;
  launchDateStart: Date;
  launchDateEnd: Date;
  productCount: number;
  totalRevenue: number;
  totalUnitsSold: number;
  averageRevenue: number;
  averageUnitsSold: number;
  retentionRate: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export class ListingPerformanceResponseDto implements IListingPerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  marketplaceId: string;
  accountId: string;
  listingQuality: ListingQualityScore;
  qualityScore: number;
  priceCompetitiveness: PriceCompetitiveness;
  competitivenessScore: number;
  stockAvailability: StockAvailability;
  hasImages: boolean;
  hasDescription: boolean;
  hasBulletPoints: boolean;
  hasKeywords: boolean;
  hasReviews: boolean;
  averageRating?: number;
  reviewCount?: number;
  impressions: number;
  clicks: number;
  conversionRate: number;
  lastUpdated: Date;
  metadata?: Record<string, any>;
}

export class MarketplacePerformanceResponseDto implements IMarketplacePerformance {
  workspaceId: string;
  productId: string;
  sku: string;
  marketplaceId: string;
  marketplaceName: string;
  accountId: string;
  isActive: boolean;
  metrics: IProductPerformanceMetrics;
  listingQuality: ListingQualityScore;
  priceCompetitiveness: PriceCompetitiveness;
  stockAvailability: StockAvailability;
  rank?: number;
  period: ProductPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}
