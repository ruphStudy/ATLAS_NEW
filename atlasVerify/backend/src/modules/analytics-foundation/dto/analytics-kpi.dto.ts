import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  AnalyticsEntityType,
  AnalyticsAggregation,
} from '../interfaces';

export class RegisterAnalyticsKpiDto {
  @IsString()
  workspaceId: string;

  @IsString()
  kpiKey: string;

  @IsString()
  name: string;

  @IsEnum(AnalyticsEntityType)
  entityType: AnalyticsEntityType;

  @IsString()
  metricKey: string;

  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @IsEnum(AnalyticsAggregation)
  period: AnalyticsAggregation;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAnalyticsKpiDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsNumber()
  targetValue?: number;

  @IsOptional()
  @IsNumber()
  currentValue?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AnalyticsKpiResponseDto {
  id: string;
  workspaceId: string;
  kpiKey: string;
  name: string;
  entityType: AnalyticsEntityType;
  metricKey: string;
  targetValue?: number;
  currentValue?: number;
  previousValue?: number;
  changePercent?: number;
  period: AnalyticsAggregation;
  isActive: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  lastCalculatedAt?: Date;
}
