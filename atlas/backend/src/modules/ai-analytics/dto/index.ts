import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsDate, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import {
  AiMetricType,
  AiPeriod,
  AiDimension,
  AiPerformanceCategory,
  AiComparisonType,
  IRequestMetrics,
  IUsageCostMetrics,
  ICacheMetrics,
  IQualityMetrics,
  IAgentWorkflowMetrics,
  IDecisionMetrics,
  IAiPerformance,
  IAiTrend,
  IAiBreakdown,
  IAiComparison,
  IAiIssueAlert,
} from '../interfaces';

export class GetAiPerformanceDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(AiPeriod)
  @IsOptional()
  period?: AiPeriod;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modelKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  useCases?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  agentIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  workflowIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  features?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  userIds?: string[];

  @IsArray()
  @IsEnum(AiPerformanceCategory, { each: true })
  @IsOptional()
  performanceCategories?: AiPerformanceCategory[];

  @IsNumber()
  @IsOptional()
  minCost?: number;

  @IsNumber()
  @IsOptional()
  maxCost?: number;

  @IsNumber()
  @IsOptional()
  minLatency?: number;

  @IsNumber()
  @IsOptional()
  maxLatency?: number;

  @IsNumber()
  @IsOptional()
  minSuccessRate?: number;

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

export class GetAiTrendsDto extends GetAiPerformanceDto {
  @IsEnum(AiMetricType)
  @IsNotEmpty()
  metricType!: AiMetricType;

  @IsEnum(AiPeriod)
  @IsNotEmpty()
  period!: AiPeriod;

  @IsEnum(AiDimension)
  @IsOptional()
  dimension?: AiDimension;

  @IsString()
  @IsOptional()
  dimensionValue?: string;
}

export class GetAiBreakdownDto extends GetAiPerformanceDto {
  @IsEnum(AiDimension)
  @IsNotEmpty()
  dimension!: AiDimension;
}

export class GetAiComparisonDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsEnum(AiPeriod)
  @IsOptional()
  period?: AiPeriod;

  @IsEnum(AiComparisonType)
  @IsNotEmpty()
  comparisonType!: AiComparisonType;

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
  providerKey?: string;

  @IsString()
  @IsOptional()
  modelKey?: string;

  @IsString()
  @IsOptional()
  capability?: string;
}

export class GetAiIssueAlertsDto {
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
  @IsEnum(AiPerformanceCategory, { each: true })
  @IsOptional()
  alertTypes?: AiPerformanceCategory[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  severities?: Array<'low' | 'medium' | 'high' | 'critical'>;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  providerKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  modelKeys?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  capabilities?: string[];

  @IsNumber()
  @IsOptional()
  limit?: number;
}

export class AiPerformanceResponseDto implements IAiPerformance {
  workspaceId!: string;
  period!: AiPeriod;
  startDate!: Date;
  endDate!: Date;
  performanceCategory!: AiPerformanceCategory;
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  useCase?: string;
  agentId?: string;
  workflowId?: string;
  feature?: string;
  requestMetrics!: IRequestMetrics;
  usageCostMetrics!: IUsageCostMetrics;
  cacheMetrics!: ICacheMetrics;
  qualityMetrics!: IQualityMetrics;
  agentWorkflowMetrics!: IAgentWorkflowMetrics;
  decisionMetrics!: IDecisionMetrics;
  overallScore!: number;
  metadata?: Record<string, any>;
}

export class AiTrendResponseDto implements IAiTrend {
  workspaceId!: string;
  period!: AiPeriod;
  periodStart!: Date;
  periodEnd!: Date;
  metricType!: AiMetricType;
  value!: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: AiDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export class AiBreakdownResponseDto implements IAiBreakdown {
  workspaceId!: string;
  dimension!: AiDimension;
  dimensionValue!: string;
  dimensionLabel?: string;
  period!: AiPeriod;
  startDate!: Date;
  endDate!: Date;
  requestMetrics!: IRequestMetrics;
  usageCostMetrics!: IUsageCostMetrics;
  cacheMetrics!: ICacheMetrics;
  qualityMetrics!: IQualityMetrics;
  agentWorkflowMetrics!: IAgentWorkflowMetrics;
  decisionMetrics!: IDecisionMetrics;
  overallScore!: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export class AiComparisonResponseDto implements IAiComparison {
  workspaceId!: string;
  comparisonType!: AiComparisonType;
  period!: AiPeriod;
  startDate!: Date;
  endDate!: Date;
  actualMetrics!: {
    requestMetrics: IRequestMetrics;
    usageCostMetrics: IUsageCostMetrics;
    cacheMetrics: ICacheMetrics;
    qualityMetrics: IQualityMetrics;
    agentWorkflowMetrics: IAgentWorkflowMetrics;
    decisionMetrics: IDecisionMetrics;
    overallScore: number;
  };
  comparisonMetrics!: {
    requestMetrics: IRequestMetrics;
    usageCostMetrics: IUsageCostMetrics;
    cacheMetrics: ICacheMetrics;
    qualityMetrics: IQualityMetrics;
    agentWorkflowMetrics: IAgentWorkflowMetrics;
    decisionMetrics: IDecisionMetrics;
    overallScore: number;
  };
  variance!: {
    costVariance: number;
    costVariancePercent: number;
    latencyVariance: number;
    latencyVariancePercent: number;
    successRatePoints: number;
    cacheHitRatePoints: number;
    qualityScorePoints: number;
    overallScorePoints: number;
  };
  providerKey?: string;
  modelKey?: string;
  metadata?: Record<string, any>;
}

export class AiIssueAlertResponseDto implements IAiIssueAlert {
  workspaceId!: string;
  alertType!: AiPerformanceCategory;
  severity!: 'low' | 'medium' | 'high' | 'critical';
  providerKey?: string;
  modelKey?: string;
  capability?: string;
  agentId?: string;
  workflowId?: string;
  feature?: string;
  reason!: string;
  details!: Record<string, any>;
  detectedAt!: Date;
  metadata?: Record<string, any>;
}
