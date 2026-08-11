import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  SupplierMetricType,
  SupplierPeriod,
  SupplierDimension,
  SupplierPerformanceCategory,
  SupplierComparisonType,
  ISupplierQuotationMetrics,
  ISupplierProcurementMetrics,
  ISupplierQualityMetrics,
  ISupplierPerformance,
  ISupplierTrend,
  ISupplierBreakdown,
  ISupplierComparison,
  ISupplierRanking,
} from '../interfaces';

export class GetSupplierPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(SupplierPeriod)
  @IsOptional()
  period?: SupplierPeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supplierIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

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

  @IsEnum(SupplierPerformanceCategory)
  @IsOptional()
  performanceCategory?: SupplierPerformanceCategory;

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

export class GetSupplierTrendsDto extends GetSupplierPerformanceDto {
  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsEnum(SupplierMetricType)
  @IsNotEmpty()
  metricType: SupplierMetricType;

  @IsEnum(SupplierPeriod)
  @IsNotEmpty()
  period: SupplierPeriod;
}

export class GetSupplierBreakdownDto extends GetSupplierPerformanceDto {
  @IsEnum(SupplierDimension)
  @IsNotEmpty()
  dimension: SupplierDimension;
}

export class GetSupplierComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  supplierId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(SupplierComparisonType)
  @IsNotEmpty()
  comparisonType: SupplierComparisonType;

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

export class GetSupplierRankingDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(SupplierPeriod)
  @IsOptional()
  period?: SupplierPeriod;

  @IsString()
  @IsOptional()
  category?: string;

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class SupplierQuotationMetricsResponseDto implements ISupplierQuotationMetrics {
  rfqSent: number;
  quotationsReceived: number;
  responseRate: number;
  averagePriceCompetitiveness: number;
  averageMoq: number;
  averageLeadTime: number;
  favorablePaymentTermsPercent: number;
}

export class SupplierProcurementMetricsResponseDto implements ISupplierProcurementMetrics {
  purchaseOrderCount: number;
  totalPurchaseOrderValue: number;
  fulfillmentRate: number;
  onTimeDispatchRate: number;
  onTimeDeliveryRate: number;
  averageDeliveryDays: number;
}

export class SupplierQualityMetricsResponseDto implements ISupplierQualityMetrics {
  inspectionsCompleted: number;
  qualityScore: number;
  defectRate: number;
  rejectionRate: number;
  inspectionFailureRate: number;
  returnRate: number;
  returnImpactAmount: number;
}

export class SupplierPerformanceResponseDto implements ISupplierPerformance {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  providerKey?: string;
  category?: string;
  country?: string;
  performanceCategory: SupplierPerformanceCategory;
  quotationMetrics: ISupplierQuotationMetrics;
  procurementMetrics: ISupplierProcurementMetrics;
  qualityMetrics: ISupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export class SupplierTrendResponseDto implements ISupplierTrend {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  period: SupplierPeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: SupplierMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  metadata?: Record<string, any>;
}

export class SupplierBreakdownResponseDto implements ISupplierBreakdown {
  workspaceId: string;
  dimension: SupplierDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  quotationMetrics: ISupplierQuotationMetrics;
  procurementMetrics: ISupplierProcurementMetrics;
  qualityMetrics: ISupplierQualityMetrics;
  overallScore: number;
  rank?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export class SupplierComparisonResponseDto implements ISupplierComparison {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  comparisonType: SupplierComparisonType;
  actualMetrics: {
    quotationMetrics: ISupplierQuotationMetrics;
    procurementMetrics: ISupplierProcurementMetrics;
    qualityMetrics: ISupplierQualityMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    quotationMetrics: ISupplierQuotationMetrics;
    procurementMetrics: ISupplierProcurementMetrics;
    qualityMetrics: ISupplierQualityMetrics;
    overallScore: number;
  };
  variance: {
    responseRatePoints: number;
    priceCompetitivenessPoints: number;
    fulfillmentRatePoints: number;
    onTimeDeliveryRatePoints: number;
    qualityScorePoints: number;
    defectRatePoints: number;
    overallScorePoints: number;
  };
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  currency: string;
  metadata?: Record<string, any>;
}

export class SupplierRankingResponseDto implements ISupplierRanking {
  workspaceId: string;
  supplierId: string;
  supplierName: string;
  category?: string;
  overallScore: number;
  rank: number;
  quotationScore: number;
  procurementScore: number;
  qualityScore: number;
  verificationScore?: number;
  riskScore?: number;
  period: SupplierPeriod;
  startDate: Date;
  endDate: Date;
  metadata?: Record<string, any>;
}
