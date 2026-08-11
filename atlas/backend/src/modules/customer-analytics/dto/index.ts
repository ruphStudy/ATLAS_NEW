import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  CustomerMetricType,
  CustomerPeriod,
  CustomerDimension,
  CustomerSegment,
  CustomerComparisonType,
  ICustomerCountMetrics,
  IPurchaseBehaviorMetrics,
  IReturnRefundMetrics,
  ICustomerValueMetrics,
  ICustomerPerformance,
  ICustomerTrend,
  ICustomerBreakdown,
  ICustomerComparison,
  ICustomerCohort,
  IProductAffinity,
  ICustomerSegmentAlert,
} from '../interfaces';

export class GetCustomerPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(CustomerPeriod)
  @IsOptional()
  period?: CustomerPeriod;

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
  countries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  regions?: string[];

  @IsArray()
  @IsEnum(CustomerSegment, { each: true })
  @IsOptional()
  segments?: CustomerSegment[];

  @IsNumber()
  @IsOptional()
  minLifetimeValue?: number;

  @IsNumber()
  @IsOptional()
  maxLifetimeValue?: number;

  @IsNumber()
  @IsOptional()
  minOrderCount?: number;

  @IsNumber()
  @IsOptional()
  minRetentionRate?: number;

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

export class GetCustomerTrendsDto extends GetCustomerPerformanceDto {
  @IsEnum(CustomerMetricType)
  @IsNotEmpty()
  metricType: CustomerMetricType;

  @IsEnum(CustomerPeriod)
  @IsNotEmpty()
  period: CustomerPeriod;

  @IsEnum(CustomerDimension)
  @IsOptional()
  dimension?: CustomerDimension;

  @IsString()
  @IsOptional()
  dimensionValue?: string;
}

export class GetCustomerBreakdownDto extends GetCustomerPerformanceDto {
  @IsEnum(CustomerDimension)
  @IsNotEmpty()
  dimension: CustomerDimension;
}

export class GetCustomerComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(CustomerPeriod)
  @IsOptional()
  period?: CustomerPeriod;

  @IsEnum(CustomerComparisonType)
  @IsNotEmpty()
  comparisonType: CustomerComparisonType;

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
  marketplaceId?: string;

  @IsEnum(CustomerSegment)
  @IsOptional()
  segment?: CustomerSegment;
}

export class GetCustomerCohortDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  cohortStart: Date;

  @IsDate()
  @Type(() => Date)
  cohortEnd: Date;

  @IsEnum(CustomerPeriod)
  @IsNotEmpty()
  cohortPeriod: CustomerPeriod;

  @IsNumber()
  @IsOptional()
  periodsToTrack?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];
}

export class GetProductAffinityDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsNumber()
  @IsOptional()
  minAffinityScore?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class GetCustomerSegmentAlertsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsArray()
  @IsEnum(CustomerSegment, { each: true })
  @IsOptional()
  alertTypes?: CustomerSegment[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class CustomerPerformanceResponseDto implements ICustomerPerformance {
  workspaceId: string;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  segment: CustomerSegment;
  marketplaceId?: string;
  marketplaceName?: string;
  accountId?: string;
  country?: string;
  region?: string;
  countMetrics: ICustomerCountMetrics;
  purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
  returnRefundMetrics: IReturnRefundMetrics;
  valueMetrics: ICustomerValueMetrics;
  overallScore: number;
  metadata?: Record<string, any>;
}

export class CustomerTrendResponseDto implements ICustomerTrend {
  workspaceId: string;
  period: CustomerPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: CustomerMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: CustomerDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export class CustomerBreakdownResponseDto implements ICustomerBreakdown {
  workspaceId: string;
  dimension: CustomerDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  countMetrics: ICustomerCountMetrics;
  purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
  returnRefundMetrics: IReturnRefundMetrics;
  valueMetrics: ICustomerValueMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export class CustomerComparisonResponseDto implements ICustomerComparison {
  workspaceId: string;
  comparisonType: CustomerComparisonType;
  period: CustomerPeriod;
  startDate: Date;
  endDate: Date;
  actualMetrics: {
    countMetrics: ICustomerCountMetrics;
    purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
    returnRefundMetrics: IReturnRefundMetrics;
    valueMetrics: ICustomerValueMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    countMetrics: ICustomerCountMetrics;
    purchaseBehaviorMetrics: IPurchaseBehaviorMetrics;
    returnRefundMetrics: IReturnRefundMetrics;
    valueMetrics: ICustomerValueMetrics;
    overallScore: number;
  };
  variance: {
    customerGrowthVariance: number;
    customerGrowthVariancePercent: number;
    retentionRatePoints: number;
    clvVariance: number;
    clvVariancePercent: number;
    returnRatePoints: number;
    overallScorePoints: number;
  };
  marketplaceId?: string;
  marketplaceName?: string;
  segment?: CustomerSegment;
  metadata?: Record<string, any>;
}

export class CustomerCohortResponseDto implements ICustomerCohort {
  workspaceId: string;
  cohortPeriod: CustomerPeriod;
  cohortStart: Date;
  cohortEnd: Date;
  customersInCohort: number;
  retentionByPeriod: Array<{
    period: number;
    periodLabel: string;
    activeCustomers: number;
    retentionRate: number;
    revenue: number;
  }>;
  metadata?: Record<string, any>;
}

export class ProductAffinityResponseDto implements IProductAffinity {
  workspaceId: string;
  productId: string;
  productName?: string;
  categoryId?: string;
  categoryName?: string;
  customerCount: number;
  purchaseCount: number;
  revenue: number;
  affinityScore: number;
  crossSellOpportunities: Array<{
    productId: string;
    productName?: string;
    coOccurrenceRate: number;
    upliftPotential: number;
  }>;
}

export class CustomerSegmentAlertResponseDto implements ICustomerSegmentAlert {
  workspaceId: string;
  alertType: CustomerSegment;
  severity: 'low' | 'medium' | 'high' | 'critical';
  customerCount: number;
  marketplaceId?: string;
  marketplaceName?: string;
  segment?: CustomerSegment;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}
