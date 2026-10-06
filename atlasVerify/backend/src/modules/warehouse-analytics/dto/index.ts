import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  WarehouseMetricType,
  WarehousePeriod,
  WarehouseDimension,
  WarehousePerformanceCategory,
  WarehouseComparisonType,
  IOperationalMetrics,
  ICapacityMetrics,
  IInventoryEfficiencyMetrics,
  ILaborProductivityMetrics,
  ISlaPerformanceMetrics,
  IWarehousePerformance,
  IWarehouseTrend,
  IWarehouseBreakdown,
  IWarehouseComparison,
  IWarehouseIssueAlert,
} from '../interfaces';

export class GetWarehousePerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(WarehousePeriod)
  @IsOptional()
  period?: WarehousePeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  zoneIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  locationIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  binIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  shiftIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

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
  operationTypes?: string[];

  @IsArray()
  @IsEnum(WarehousePerformanceCategory, { each: true })
  @IsOptional()
  performanceCategories?: WarehousePerformanceCategory[];

  @IsNumber()
  @IsOptional()
  minThroughput?: number;

  @IsNumber()
  @IsOptional()
  maxThroughput?: number;

  @IsNumber()
  @IsOptional()
  minUtilization?: number;

  @IsNumber()
  @IsOptional()
  maxUtilization?: number;

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

export class GetWarehouseTrendsDto extends GetWarehousePerformanceDto {
  @IsEnum(WarehouseMetricType)
  @IsNotEmpty()
  metricType: WarehouseMetricType;

  @IsEnum(WarehousePeriod)
  @IsNotEmpty()
  period: WarehousePeriod;

  @IsEnum(WarehouseDimension)
  @IsOptional()
  dimension?: WarehouseDimension;

  @IsString()
  @IsOptional()
  dimensionValue?: string;
}

export class GetWarehouseBreakdownDto extends GetWarehousePerformanceDto {
  @IsEnum(WarehouseDimension)
  @IsNotEmpty()
  dimension: WarehouseDimension;
}

export class GetWarehouseComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  endDate: Date;

  @IsEnum(WarehousePeriod)
  @IsOptional()
  period?: WarehousePeriod;

  @IsEnum(WarehouseComparisonType)
  @IsNotEmpty()
  comparisonType: WarehouseComparisonType;

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
  warehouseId?: string;

  @IsString()
  @IsOptional()
  zoneId?: string;
}

export class GetWarehouseIssueAlertsDto {
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
  @IsEnum(WarehousePerformanceCategory, { each: true })
  @IsOptional()
  alertTypes?: WarehousePerformanceCategory[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  warehouseIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  zoneIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  operationTypes?: string[];

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class WarehousePerformanceResponseDto implements IWarehousePerformance {
  workspaceId: string;
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  performanceCategory: WarehousePerformanceCategory;
  operationalMetrics: IOperationalMetrics;
  capacityMetrics: ICapacityMetrics;
  inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
  laborProductivityMetrics: ILaborProductivityMetrics;
  slaPerformanceMetrics: ISlaPerformanceMetrics;
  throughput: number;
  overallScore: number;
  metadata?: Record<string, any>;
}

export class WarehouseTrendResponseDto implements IWarehouseTrend {
  workspaceId: string;
  warehouseId?: string;
  warehouseName?: string;
  period: WarehousePeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: WarehouseMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: WarehouseDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export class WarehouseBreakdownResponseDto implements IWarehouseBreakdown {
  workspaceId: string;
  dimension: WarehouseDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  operationalMetrics: IOperationalMetrics;
  capacityMetrics: ICapacityMetrics;
  inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
  laborProductivityMetrics: ILaborProductivityMetrics;
  slaPerformanceMetrics: ISlaPerformanceMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export class WarehouseComparisonResponseDto implements IWarehouseComparison {
  workspaceId: string;
  comparisonType: WarehouseComparisonType;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  actualMetrics: {
    operationalMetrics: IOperationalMetrics;
    capacityMetrics: ICapacityMetrics;
    inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
    laborProductivityMetrics: ILaborProductivityMetrics;
    slaPerformanceMetrics: ISlaPerformanceMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    operationalMetrics: IOperationalMetrics;
    capacityMetrics: ICapacityMetrics;
    inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
    laborProductivityMetrics: ILaborProductivityMetrics;
    slaPerformanceMetrics: ISlaPerformanceMetrics;
    overallScore: number;
  };
  variance: {
    throughputVariance: number;
    throughputVariancePercent: number;
    utilizationVariancePoints: number;
    accuracyVariancePoints: number;
    cycleTimeVariance: number;
    slaComplianceVariancePoints: number;
    overallScorePoints: number;
  };
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  metadata?: Record<string, any>;
}

export class WarehouseIssueAlertResponseDto implements IWarehouseIssueAlert {
  workspaceId: string;
  alertType: WarehousePerformanceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  locationId?: string;
  binId?: string;
  operationType?: string;
  userId?: string;
  productId?: string;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}
