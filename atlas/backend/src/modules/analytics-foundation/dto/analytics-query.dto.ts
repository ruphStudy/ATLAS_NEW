import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  ValidateNested,
  IsNumber,
  IsDate,
  IsObject,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnalyticsEntityType,
  AnalyticsAggregation,
  AnalyticsFilterOperator,
} from '../interfaces';

export class AnalyticsFilterDto {
  @IsString()
  dimensionKey!: string;

  @IsEnum(AnalyticsFilterOperator)
  operator!: AnalyticsFilterOperator;

  @IsOptional()
  value?: any;

  @IsOptional()
  @IsArray()
  values?: any[];
}

export class ExecuteAnalyticsQueryDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(AnalyticsEntityType)
  entityType!: AnalyticsEntityType;

  @IsArray()
  @IsString({ each: true })
  metrics!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dimensions?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnalyticsFilterDto)
  filters?: AnalyticsFilterDto[];

  @IsOptional()
  @IsEnum(AnalyticsAggregation)
  aggregation?: AnalyticsAggregation;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;

  @IsOptional()
  @IsObject()
  orderBy?: {
    field: string;
    direction: 'asc' | 'desc';
  };
}

export class AnalyticsQueryResultDto {
  queryId!: string;
  entityType!: AnalyticsEntityType;
  data!: Record<string, any>[];
  total!: number;
  executionTimeMs!: number;
  metadata?: Record<string, any>;
}
