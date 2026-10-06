import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsDate,
  IsObject,
  IsArray,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ForecastType,
  ForecastScope,
  ForecastHorizon,
  ForecastStrategy,
  ForecastStatus,
  ForecastTrigger,
  IForecastDefinition,
  IForecastExecution,
  IForecastResult,
  IBacktestResult,
  IForecastSnapshot,
} from '../interfaces';

export class CreateForecastDefinitionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsNotEmpty()
  definitionKey!: string;

  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ForecastType)
  @IsNotEmpty()
  forecastType!: ForecastType;

  @IsEnum(ForecastScope)
  @IsNotEmpty()
  scope!: ForecastScope;

  @IsString()
  @IsNotEmpty()
  scopeId!: string;

  @IsEnum(ForecastStrategy)
  @IsNotEmpty()
  strategy!: ForecastStrategy;

  @IsEnum(ForecastHorizon)
  @IsNotEmpty()
  horizon!: ForecastHorizon;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  periodsAhead!: number;

  @IsNumber()
  @IsNotEmpty()
  @Min(1)
  historicalPeriods!: number;

  @IsBoolean()
  @IsOptional()
  includeSeasonality?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTrends?: boolean;

  @IsBoolean()
  @IsOptional()
  includePromotions?: boolean;

  @IsBoolean()
  @IsOptional()
  includeExternalSignals?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceLevel?: number;

  @IsBoolean()
  @IsOptional()
  autoRefresh?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  refreshIntervalHours?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  accuracyThreshold?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  createdBy?: string;
}

export class UpdateForecastDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ForecastStrategy)
  @IsOptional()
  strategy?: ForecastStrategy;

  @IsEnum(ForecastHorizon)
  @IsOptional()
  horizon?: ForecastHorizon;

  @IsNumber()
  @IsOptional()
  @Min(1)
  periodsAhead?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  historicalPeriods?: number;

  @IsBoolean()
  @IsOptional()
  includeSeasonality?: boolean;

  @IsBoolean()
  @IsOptional()
  includeTrends?: boolean;

  @IsBoolean()
  @IsOptional()
  includePromotions?: boolean;

  @IsBoolean()
  @IsOptional()
  includeExternalSignals?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  confidenceLevel?: number;

  @IsBoolean()
  @IsOptional()
  autoRefresh?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  refreshIntervalHours?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(1)
  accuracyThreshold?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;

  @IsString()
  @IsOptional()
  updatedBy?: string;
}

export class GenerateForecastDto {
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ForecastTrigger)
  @IsOptional()
  trigger?: ForecastTrigger;

  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;

  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

export class BacktestForecastDto {
  @IsString()
  @IsNotEmpty()
  definitionId!: string;

  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  testPeriodStart!: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  testPeriodEnd!: Date;

  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

export class BulkGenerateForecastDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  definitionIds!: string[];

  @IsString()
  @IsOptional()
  triggeredBy?: string;
}

export class DefinitionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsEnum(ForecastType)
  @IsOptional()
  forecastType?: ForecastType;

  @IsEnum(ForecastScope)
  @IsOptional()
  scope?: ForecastScope;

  @IsString()
  @IsOptional()
  scopeId?: string;

  @IsEnum(ForecastStrategy)
  @IsOptional()
  strategy?: ForecastStrategy;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsString()
  @IsOptional()
  search?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class ExecutionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  definitionId?: string;

  @IsEnum(ForecastStatus)
  @IsOptional()
  status?: ForecastStatus;

  @IsEnum(ForecastTrigger)
  @IsOptional()
  trigger?: ForecastTrigger;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  startDate?: Date;

  @IsDate()
  @Type(() => Date)
  @IsOptional()
  endDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(1)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  limit?: number;
}

export class ForecastDefinitionResponseDto implements IForecastDefinition {
  id!: string;
  workspaceId!: string;
  definitionKey!: string;
  name!: string;
  description?: string;
  forecastType!: ForecastType;
  scope!: ForecastScope;
  scopeId!: string;
  strategy!: ForecastStrategy;
  horizon!: ForecastHorizon;
  periodsAhead!: number;
  historicalPeriods!: number;
  includeSeasonality!: boolean;
  includeTrends!: boolean;
  includePromotions!: boolean;
  includeExternalSignals!: boolean;
  confidenceLevel!: number;
  autoRefresh!: boolean;
  refreshIntervalHours?: number;
  accuracyThreshold?: number;
  version!: number;
  enabled!: boolean;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ForecastExecutionResponseDto implements IForecastExecution {
  id!: string;
  definitionId!: string;
  workspaceId!: string;
  definitionKey!: string;
  forecastType!: ForecastType;
  scope!: ForecastScope;
  scopeId!: string;
  strategy!: ForecastStrategy;
  status!: ForecastStatus;
  trigger!: ForecastTrigger;
  forecastStart!: Date;
  forecastEnd!: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  dataPointsUsed?: number;
  dataQualityScore?: number;
  errorCode?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ForecastResultResponseDto implements IForecastResult {
  id!: string;
  executionId!: string;
  definitionId!: string;
  workspaceId!: string;
  forecastType!: ForecastType;
  scope!: ForecastScope;
  scopeId!: string;
  strategy!: ForecastStrategy;
  horizon!: ForecastHorizon;
  generatedAt!: Date;
  dataPoints!: any[];
  assumptions: any;
  dataQuality: any;
  version!: number;
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class BacktestResultResponseDto implements IBacktestResult {
  id!: string;
  definitionId!: string;
  executionId!: string;
  workspaceId!: string;
  testPeriodStart!: Date;
  testPeriodEnd!: Date;
  strategy!: ForecastStrategy;
  metrics!: {
    mae: number;
    mape: number;
    rmse: number;
    accuracy: number;
  };
  metadata?: Record<string, any>;
  createdAt!: Date;
}

export class PaginatedDefinitionResponseDto {
  data!: ForecastDefinitionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PaginatedExecutionResponseDto {
  data!: ForecastExecutionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
