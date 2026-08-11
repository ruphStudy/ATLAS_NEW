import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsArray,
  IsNumber,
  IsDate,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AggregationMode,
  AggregationStatus,
  TimeBucket,
  DimensionType,
  MetricType,
  SourceModule,
  IDimension,
  IMetric,
  IMeasure,
  IAggregationDefinition,
  IAggregationExecution,
  IAggregationSnapshot,
} from '../interfaces';

export class DimensionDto implements IDimension {
  @IsEnum(DimensionType)
  @IsNotEmpty()
  type: DimensionType;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  sourceColumn: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  hierarchyPath?: string[];
}

export class MetricDto implements IMetric {
  @IsString()
  @IsNotEmpty()
  key: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(MetricType)
  @IsNotEmpty()
  type: MetricType;

  @IsString()
  @IsNotEmpty()
  sourceColumn: string;

  @IsEnum(SourceModule)
  @IsNotEmpty()
  sourceModule: SourceModule;

  @IsString()
  @IsOptional()
  formula?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  decimals?: number;

  @IsString()
  @IsOptional()
  unit?: string;

  @IsArray()
  @IsOptional()
  conditions?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
}

export class CreateAggregationDefinitionDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  definitionKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(SourceModule)
  @IsNotEmpty()
  sourceModule: SourceModule;

  @IsEnum(AggregationMode)
  @IsNotEmpty()
  mode: AggregationMode;

  @IsEnum(TimeBucket)
  @IsNotEmpty()
  timeBucket: TimeBucket;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionDto)
  @IsNotEmpty()
  dimensions: DimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  @IsNotEmpty()
  metrics: MetricDto[];

  @IsArray()
  @IsOptional()
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;

  @IsString()
  @IsOptional()
  scheduleExpression?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  refreshIntervalMinutes?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  retentionDays?: number;

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

export class UpdateAggregationDefinitionDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AggregationMode)
  @IsOptional()
  mode?: AggregationMode;

  @IsEnum(TimeBucket)
  @IsOptional()
  timeBucket?: TimeBucket;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DimensionDto)
  @IsOptional()
  dimensions?: DimensionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MetricDto)
  @IsOptional()
  metrics?: MetricDto[];

  @IsArray()
  @IsOptional()
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;

  @IsString()
  @IsOptional()
  scheduleExpression?: string;

  @IsNumber()
  @IsOptional()
  @Min(1)
  refreshIntervalMinutes?: number;

  @IsNumber()
  @IsOptional()
  @Min(1)
  retentionDays?: number;

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

export class ExecuteAggregationDto {
  @IsString()
  @IsNotEmpty()
  definitionId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  periodStart: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  periodEnd: Date;

  @IsBoolean()
  @IsOptional()
  forceRefresh?: boolean;

  @IsString()
  @IsOptional()
  executedBy?: string;
}

export class BackfillAggregationDto {
  @IsString()
  @IsNotEmpty()
  definitionId: string;

  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  startDate: Date;

  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  endDate: Date;

  @IsString()
  @IsOptional()
  executedBy?: string;
}

export class DefinitionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(SourceModule)
  @IsOptional()
  sourceModule?: SourceModule;

  @IsEnum(AggregationMode)
  @IsOptional()
  mode?: AggregationMode;

  @IsEnum(TimeBucket)
  @IsOptional()
  timeBucket?: TimeBucket;

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
  workspaceId: string;

  @IsString()
  @IsOptional()
  definitionId?: string;

  @IsEnum(AggregationStatus)
  @IsOptional()
  status?: AggregationStatus;

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

export class AggregationDefinitionResponseDto implements IAggregationDefinition {
  id: string;
  workspaceId: string;
  definitionKey: string;
  name: string;
  description?: string;
  sourceModule: SourceModule;
  mode: AggregationMode;
  timeBucket: TimeBucket;
  dimensions: IDimension[];
  metrics: IMetric[];
  filters?: Array<{
    field: string;
    operator: string;
    value: any;
  }>;
  scheduleExpression?: string;
  refreshIntervalMinutes?: number;
  retentionDays?: number;
  enabled: boolean;
  version: number;
  metadata?: Record<string, any>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class AggregationExecutionResponseDto implements IAggregationExecution {
  id: string;
  definitionId: string;
  workspaceId: string;
  definitionKey: string;
  mode: AggregationMode;
  status: AggregationStatus;
  timeBucket: TimeBucket;
  periodStart: Date;
  periodEnd: Date;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  progress?: number;
  progressMessage?: string;
  cursorPosition?: string;
  eventsProcessed?: number;
  recordsAggregated?: number;
  snapshotId?: string;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class AggregationSnapshotResponseDto implements IAggregationSnapshot {
  id: string;
  definitionId: string;
  executionId: string;
  workspaceId: string;
  definitionKey: string;
  timeBucket: TimeBucket;
  periodStart: Date;
  periodEnd: Date;
  version: number;
  measures: IMeasure[];
  recordCount: number;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export class PaginatedDefinitionResponseDto {
  data: AggregationDefinitionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedExecutionResponseDto {
  data: AggregationExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
