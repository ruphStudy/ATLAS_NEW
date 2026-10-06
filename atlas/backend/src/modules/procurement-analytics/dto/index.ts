import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ProcurementMetricType,
  ProcurementPeriod,
  ProcurementDimension,
  ProcurementPerformanceCategory,
  ProcurementComparisonType,
  PurchaseOrderStatus,
  IRfqQuotationMetrics,
  IPurchaseOrderMetrics,
  ICostMetrics,
  IDeliveryQualityMetrics,
  IProcurementPerformance,
  IProcurementTrend,
  IProcurementBreakdown,
  IProcurementComparison,
  IProcurementRiskAlert,
} from '../interfaces';

export class GetProcurementPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(ProcurementPeriod)
  @IsOptional()
  period?: ProcurementPeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supplierIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  categories?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  countries?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  currencies?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  purchaseOrderIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  rfqIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  quotationIds?: string[];

  @IsArray()
  @IsEnum(PurchaseOrderStatus, { each: true })
  @IsOptional()
  statuses?: PurchaseOrderStatus[];

  @IsArray()
  @IsEnum(ProcurementPerformanceCategory, { each: true })
  @IsOptional()
  performanceCategories?: ProcurementPerformanceCategory[];

  @IsNumber()
  @IsOptional()
  minOrderValue?: number;

  @IsNumber()
  @IsOptional()
  maxOrderValue?: number;

  @IsNumber()
  @IsOptional()
  minOverallScore?: number;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  buyerIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsString()
  @IsOptional()
  currency?: string;

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

export class GetProcurementTrendsDto extends GetProcurementPerformanceDto {
  @IsEnum(ProcurementMetricType)
  @IsNotEmpty()
  metricType!: ProcurementMetricType;

  @IsEnum(ProcurementPeriod)
  @IsNotEmpty()
  period!: ProcurementPeriod;

  @IsEnum(ProcurementDimension)
  @IsOptional()
  dimension?: ProcurementDimension;

  @IsString()
  @IsOptional()
  dimensionValue?: string;
}

export class GetProcurementBreakdownDto extends GetProcurementPerformanceDto {
  @IsEnum(ProcurementDimension)
  @IsNotEmpty()
  dimension!: ProcurementDimension;
}

export class GetProcurementComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(ProcurementPeriod)
  @IsOptional()
  period?: ProcurementPeriod;

  @IsEnum(ProcurementComparisonType)
  @IsNotEmpty()
  comparisonType!: ProcurementComparisonType;

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
  supplierId?: string;

  @IsString()
  @IsOptional()
  productId?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsOptional()
  currency?: string;
}

export class GetProcurementRiskAlertsDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsArray()
  @IsEnum(ProcurementPerformanceCategory, { each: true })
  @IsOptional()
  alertTypes?: ProcurementPerformanceCategory[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  supplierIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  productIds?: string[];

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class ProcurementPerformanceResponseDto implements IProcurementPerformance {
  workspaceId!: string;
  period!: ProcurementPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  performanceCategory!: ProcurementPerformanceCategory;
  rfqQuotationMetrics!: IRfqQuotationMetrics;
  purchaseOrderMetrics!: IPurchaseOrderMetrics;
  costMetrics!: ICostMetrics;
  deliveryQualityMetrics!: IDeliveryQualityMetrics;
  procurementCycleTime!: number;
  overallScore!: number;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  category?: string;
  country?: string;
  metadata?: Record<string, any>;
}

export class ProcurementTrendResponseDto implements IProcurementTrend {
  workspaceId!: string;
  period!: ProcurementPeriod;
  periodStart!: Date;
  periodEnd!: Date;
  metricType!: ProcurementMetricType;
  value!: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: ProcurementDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export class ProcurementBreakdownResponseDto implements IProcurementBreakdown {
  workspaceId!: string;
  dimension!: ProcurementDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  period!: ProcurementPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  rfqQuotationMetrics!: IRfqQuotationMetrics;
  purchaseOrderMetrics!: IPurchaseOrderMetrics;
  costMetrics!: ICostMetrics;
  deliveryQualityMetrics!: IDeliveryQualityMetrics;
  overallScore!: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export class ProcurementComparisonResponseDto implements IProcurementComparison {
  workspaceId!: string;
  comparisonType!: ProcurementComparisonType;
  period!: ProcurementPeriod;
  startDate!: Date;
  endDate!: Date;
  currency!: string;
  actualMetrics!: {
    rfqQuotationMetrics: IRfqQuotationMetrics;
    purchaseOrderMetrics: IPurchaseOrderMetrics;
    costMetrics: ICostMetrics;
    deliveryQualityMetrics: IDeliveryQualityMetrics;
    overallScore: number;
  };
  comparisonMetrics!: {
    rfqQuotationMetrics: IRfqQuotationMetrics;
    purchaseOrderMetrics: IPurchaseOrderMetrics;
    costMetrics: ICostMetrics;
    deliveryQualityMetrics: IDeliveryQualityMetrics;
    overallScore: number;
  };
  variance!: {
    spendVariance: number;
    spendVariancePercent: number;
    savingsVariance: number;
    savingsVariancePercent: number;
    fulfillmentRatePoints: number;
    onTimeDeliveryRatePoints: number;
    qualityPassRatePoints: number;
    cycleTimeVariance: number;
    overallScorePoints: number;
  };
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  metadata?: Record<string, any>;
}

export class ProcurementRiskAlertResponseDto implements IProcurementRiskAlert {
  workspaceId!: string;
  alertType!: ProcurementPerformanceCategory;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  purchaseOrderId?: string;
  supplierId?: string;
  supplierName?: string;
  productId?: string;
  productName?: string;
  rfqId?: string;
  quotationId?: string;
  reason!: string;
  details!: Record<string, any>;
  detectedAt!: Date;
  metadata?: Record<string, any>;
}
