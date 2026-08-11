import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsDate, IsArray, ValidateNested, IsObject } from 'class-validator';
import { Type } from 'class-transformer';
import {
  KpiScope,
  KpiCategory,
  KpiStatus,
  KpiHealthStatus,
  KpiTrendDirection,
  KpiAggregationType,
  KpiComparisonPeriod,
  KpiThresholdOperator,
  IKpiDefinition,
  IKpiValue,
  IKpiSnapshot,
  IKpiVersion,
  IKpiHistory,
  IKpiGroup,
  IKpiAlert,
  IKpiFormula,
  IKpiTarget,
  IKpiThreshold,
  IKpiDimension,
  IKpiMetric,
  IKpiCalculationResult,
} from '../interfaces';

export class KpiFormulaDto implements IKpiFormula {
  @IsString()
  @IsNotEmpty()
  expression: string;

  @IsObject()
  @IsNotEmpty()
  variables: Record<string, string>;

  @IsString()
  @IsOptional()
  description?: string;
}

export class KpiTargetDto implements IKpiTarget {
  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsString()
  @IsNotEmpty()
  period: string;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;
}

export class KpiThresholdDto implements IKpiThreshold {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(KpiThresholdOperator)
  @IsNotEmpty()
  operator: KpiThresholdOperator;

  @IsNumber()
  @IsNotEmpty()
  value: number;

  @IsNumber()
  @IsOptional()
  value2?: number;

  @IsEnum(KpiHealthStatus)
  @IsNotEmpty()
  healthStatus: KpiHealthStatus;

  @IsBoolean()
  @IsNotEmpty()
  alertEnabled: boolean;

  @IsString()
  @IsOptional()
  alertSeverity?: string;
}

export class KpiDimensionDto implements IKpiDimension {
  @IsString()
  @IsNotEmpty()
  dimensionKey: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  values?: string[];

  @IsBoolean()
  @IsNotEmpty()
  isRequired: boolean;
}

export class KpiMetricDto implements IKpiMetric {
  @IsString()
  @IsNotEmpty()
  metricKey: string;

  @IsEnum(KpiAggregationType)
  @IsOptional()
  aggregation?: KpiAggregationType;

  @IsNumber()
  @IsOptional()
  weight?: number;
}

export class CreateKpiDefinitionDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  kpiKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(KpiScope)
  @IsNotEmpty()
  scope: KpiScope;

  @IsEnum(KpiCategory)
  @IsNotEmpty()
  category: KpiCategory;

  @ValidateNested()
  @Type(() => KpiFormulaDto)
  @IsOptional()
  formula?: KpiFormulaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiDimensionDto)
  @IsOptional()
  dimensions?: KpiDimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiMetricDto)
  @IsOptional()
  metrics?: KpiMetricDto[];

  @ValidateNested()
  @Type(() => KpiTargetDto)
  @IsOptional()
  target?: KpiTargetDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiThresholdDto)
  @IsOptional()
  thresholds?: KpiThresholdDto[];

  @IsString()
  @IsOptional()
  unit?: string;

  @IsEnum(KpiAggregationType)
  @IsNotEmpty()
  aggregation: KpiAggregationType;

  @IsEnum(KpiComparisonPeriod)
  @IsOptional()
  comparisonPeriod?: KpiComparisonPeriod;

  @IsBoolean()
  @IsOptional()
  drillDownEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  cacheTtlMinutes?: number;

  @IsString()
  @IsOptional()
  groupKey?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  createdBy: string;
}

export class UpdateKpiDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => KpiFormulaDto)
  @IsOptional()
  formula?: KpiFormulaDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiDimensionDto)
  @IsOptional()
  dimensions?: KpiDimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiMetricDto)
  @IsOptional()
  metrics?: KpiMetricDto[];

  @ValidateNested()
  @Type(() => KpiTargetDto)
  @IsOptional()
  target?: KpiTargetDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => KpiThresholdDto)
  @IsOptional()
  thresholds?: KpiThresholdDto[];

  @IsString()
  @IsOptional()
  unit?: string;

  @IsEnum(KpiAggregationType)
  @IsOptional()
  aggregation?: KpiAggregationType;

  @IsEnum(KpiComparisonPeriod)
  @IsOptional()
  comparisonPeriod?: KpiComparisonPeriod;

  @IsBoolean()
  @IsOptional()
  drillDownEnabled?: boolean;

  @IsBoolean()
  @IsOptional()
  cacheEnabled?: boolean;

  @IsNumber()
  @IsOptional()
  cacheTtlMinutes?: number;

  @IsString()
  @IsOptional()
  groupKey?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsNotEmpty()
  updatedBy: string;
}

export class CalculateKpiDto {
  @IsString()
  @IsNotEmpty()
  kpiDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @IsObject()
  @IsOptional()
  dimensions?: Record<string, any>;

  @IsBoolean()
  @IsOptional()
  forceRecalculate?: boolean;
}

export class CreateKpiSnapshotDto {
  @IsString()
  @IsNotEmpty()
  kpiDefinitionId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  snapshotKey: string;

  @IsDate()
  @Type(() => Date)
  periodStart: Date;

  @IsDate()
  @Type(() => Date)
  periodEnd: Date;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class CreateKpiGroupDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsString()
  @IsNotEmpty()
  groupKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(KpiCategory)
  @IsOptional()
  category?: KpiCategory;
}

export class UpdateKpiGroupDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(KpiCategory)
  @IsOptional()
  category?: KpiCategory;
}

export class AcknowledgeKpiAlertDto {
  @IsString()
  @IsNotEmpty()
  acknowledgedBy: string;
}

export class KpiDefinitionResponseDto implements IKpiDefinition {
  id: string;
  workspaceId?: string;
  kpiKey: string;
  name: string;
  description?: string;
  scope: KpiScope;
  category: KpiCategory;
  status: KpiStatus;
  version: number;
  formula?: IKpiFormula;
  dimensions?: IKpiDimension[];
  metrics?: IKpiMetric[];
  target?: IKpiTarget;
  thresholds?: IKpiThreshold[];
  unit?: string;
  aggregation: KpiAggregationType;
  comparisonPeriod?: KpiComparisonPeriod;
  drillDownEnabled: boolean;
  cacheEnabled: boolean;
  cacheTtlMinutes?: number;
  groupKey?: string;
  ownerId?: string;
  metadata?: Record<string, any>;
  isSystem: boolean;
  createdBy: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  archivedAt?: Date;
}

export class KpiValueResponseDto implements IKpiValue {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  dimensions?: Record<string, any>;
  calculatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  metadata?: Record<string, any>;
}

export class KpiSnapshotResponseDto implements IKpiSnapshot {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  snapshotKey: string;
  values: IKpiValue[];
  aggregatedValue: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  periodStart: Date;
  periodEnd: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class KpiVersionResponseDto implements IKpiVersion {
  id: string;
  kpiDefinitionId: string;
  version: number;
  definition: Partial<IKpiDefinition>;
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}

export class KpiHistoryResponseDto implements IKpiHistory {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  dimensions?: Record<string, any>;
  recordedAt: Date;
  periodStart: Date;
  periodEnd: Date;
}

export class KpiGroupResponseDto implements IKpiGroup {
  id: string;
  workspaceId?: string;
  groupKey: string;
  name: string;
  description?: string;
  category?: KpiCategory;
  isSystem: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class KpiAlertResponseDto implements IKpiAlert {
  id: string;
  kpiDefinitionId: string;
  workspaceId: string;
  kpiKey: string;
  thresholdName: string;
  severity: string;
  value: number;
  thresholdValue: number;
  message: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  createdAt: Date;
  metadata?: Record<string, any>;
}

export class KpiCalculationResultResponseDto implements IKpiCalculationResult {
  kpiDefinitionId: string;
  kpiKey: string;
  value: number;
  targetValue?: number;
  variance?: number;
  variancePercent?: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  healthStatus: KpiHealthStatus;
  trendDirection: KpiTrendDirection;
  calculatedAt: Date;
  metadata?: Record<string, any>;
}

export class KpiFilterDto {
  @IsString()
  @IsOptional()
  workspaceId?: string;

  @IsEnum(KpiScope)
  @IsOptional()
  scope?: KpiScope;

  @IsEnum(KpiCategory)
  @IsOptional()
  category?: KpiCategory;

  @IsEnum(KpiStatus)
  @IsOptional()
  status?: KpiStatus;

  @IsString()
  @IsOptional()
  groupKey?: string;

  @IsString()
  @IsOptional()
  ownerId?: string;

  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;
}
