import {
  IsString,
  IsOptional,
  IsEnum,
  IsDate,
  IsArray,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ExecutiveMetricCategory,
  TrendDirection,
  AlertSeverity,
} from '../interfaces';

export class GetExecutiveOverviewDto {
  @IsString()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  startDate!: Date;

  @IsDate()
  @Type(() => Date)
  endDate!: Date;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  marketplaceIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  accountIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  comparisonPeriod?: {
    start: Date;
    end: Date;
  };
}

export class ExecutiveKpiResponseDto {
  id!: string;
  workspaceId!: string;
  category!: ExecutiveMetricCategory;
  metricKey!: string;
  name!: string;
  currentValue!: number;
  targetValue?: number;
  previousValue?: number;
  variance?: number;
  variancePercent?: number;
  trendDirection!: TrendDirection;
  unit?: string;
  period!: string;
  updatedAt!: Date;
}

export class ExecutiveSummaryResponseDto {
  category!: ExecutiveMetricCategory;
  metrics!: Record<string, number>;
  trends!: Record<string, TrendDirection>;
  alerts!: number;
  lastUpdated!: Date;
}

export class ExecutiveAlertResponseDto {
  id!: string;
  workspaceId!: string;
  severity!: AlertSeverity;
  category!: ExecutiveMetricCategory;
  title!: string;
  description!: string;
  actionRequired!: boolean;
  actionUrl?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  resolvedAt?: Date;
}

export class ExecutiveInsightResponseDto {
  category!: ExecutiveMetricCategory;
  insightType!: string;
  title!: string;
  description!: string;
  impact!: string;
  recommendation?: string;
  metadata?: Record<string, any>;
}

export class MarketplaceComparisonResponseDto {
  marketplaceId!: string;
  marketplaceName!: string;
  provider!: string;
  revenue!: number;
  orders!: number;
  averageOrderValue!: number;
  fulfillmentRate!: number;
  returnRate!: number;
  revenueGrowth!: number;
}

export class AiOperationsSummaryResponseDto {
  totalRequests!: number;
  successRate!: number;
  totalCost!: number;
  averageLatency!: number;
  topModels!: Array<{
    modelKey: string;
    requests: number;
    cost: number;
  }>;
  costSavings!: number;
  failureRate!: number;
  recommendationCount!: number;
}

export class ExecutiveOverviewResponseDto {
  kpis!: ExecutiveKpiResponseDto[];
  summaries!: ExecutiveSummaryResponseDto[];
  alerts!: ExecutiveAlertResponseDto[];
  insights!: ExecutiveInsightResponseDto[];
  marketplaceComparisons!: MarketplaceComparisonResponseDto[];
  aiOperations!: AiOperationsSummaryResponseDto;
  generatedAt!: Date;
}
