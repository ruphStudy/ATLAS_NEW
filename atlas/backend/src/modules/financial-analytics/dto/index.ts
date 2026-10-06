import { Type } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsNumber,
  IsDate,
  IsOptional,
} from 'class-validator';
import {
  IFinancialPerformance,
  IFinancialTrend,
  IFinancialBreakdown,
  IFinancialComparison,
  IFinancialAlert,
  FinancialMetricType,
  FinancialDimension,
  FinancialPeriod,
  FinancialComparisonType,
  FinancialHealthStatus,
  FinancialAnalyticsEventType,
} from '../interfaces';

export class GetFinancialPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsEnum(FinancialPeriod)
  @IsOptional()
  period?: FinancialPeriod;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productSkus?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categoryIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supplierIds?: string[];

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

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minRevenue?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxRevenue?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minMargin?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  maxMargin?: number;

  @IsArray()
  @IsEnum(FinancialHealthStatus, { each: true })
  @IsOptional()
  healthStatuses?: FinancialHealthStatus[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  minOverallScore?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class GetFinancialTrendsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsEnum(FinancialMetricType)
  metricType!: FinancialMetricType;

  @IsEnum(FinancialPeriod)
  period!: FinancialPeriod;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsEnum(FinancialDimension)
  @IsOptional()
  dimension?: FinancialDimension;

  @IsString()
  @IsOptional()
  dimensionValue?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];
}

export class GetFinancialBreakdownDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsEnum(FinancialDimension)
  dimension!: FinancialDimension;

  @IsEnum(FinancialPeriod)
  @IsOptional()
  period?: FinancialPeriod;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc';
}

export class GetFinancialComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @Type(() => Date)
  @IsDate()
  startDate!: Date;

  @Type(() => Date)
  @IsDate()
  endDate!: Date;

  @IsEnum(FinancialComparisonType)
  comparisonType!: FinancialComparisonType;

  @IsEnum(FinancialPeriod)
  @IsOptional()
  period?: FinancialPeriod;

  @IsString()
  @IsOptional()
  currency?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  comparisonStartDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  comparisonEndDate?: Date;

  @IsString()
  @IsOptional()
  marketplaceId?: string;

  @IsString()
  @IsOptional()
  productId?: string;
}

export class GetFinancialAlertsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  startDate?: Date;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  endDate?: Date;

  @IsArray()
  @IsEnum(FinancialAnalyticsEventType, { each: true })
  @IsOptional()
  alertTypes?: FinancialAnalyticsEventType[];

  @IsArray()
  @IsEnum(['low', 'medium', 'high', 'critical'], { each: true })
  @IsOptional()
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  marketplaceIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class FinancialPerformanceResponseDto implements IFinancialPerformance {
  workspaceId!: string;
  period!: FinancialPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  productId?: string;
  productSku?: string;
  categoryId?: string;
  supplierId?: string;
  marketplaceId?: string;
  accountId?: string;
  warehouseId?: string;
  country?: string;
  region?: string;
  revenueMetrics: any;
  profitMetrics: any;
  costBreakdown: any;
  cashFlowMetrics: any;
  settlementMetrics: any;
  healthStatus!: FinancialHealthStatus;
  overallScore!: number;
}

export class FinancialTrendResponseDto implements IFinancialTrend {
  period!: Date;
  metricValue!: number;
  metricType!: FinancialMetricType;
  currency!: string;
  normalizedValue?: number;
  changeFromPrevious?: number;
  changeFromPreviousPercent?: number;
}

export class FinancialBreakdownResponseDto implements IFinancialBreakdown {
  dimensionValue!: string;
  dimensionLabel?: string;
  revenue!: number;
  grossProfit!: number;
  netProfit!: number;
  margin!: number;
  totalCost!: number;
  orderCount!: number;
  contribution!: number;
  contributionPercent!: number;
  healthStatus!: FinancialHealthStatus;
}

export class FinancialComparisonResponseDto implements IFinancialComparison {
  workspaceId!: string;
  comparisonType!: FinancialComparisonType;
  period!: FinancialPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  actualMetrics: any;
  comparisonMetrics: any;
  variance: any;
  marketplaceId?: string;
  productId?: string;
}

export class FinancialAlertResponseDto implements IFinancialAlert {
  id!: string;
  workspaceId!: string;
  alertType!: FinancialAnalyticsEventType;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  message!: string;
  detectedAt!: Date;
  productId?: string;
  productSku?: string;
  marketplaceId?: string;
  supplierId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
  resolved!: boolean;
  resolvedAt?: Date;
}
