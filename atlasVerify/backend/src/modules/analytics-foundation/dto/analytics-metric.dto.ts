import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import {
  AnalyticsEntityType,
  AnalyticsMetricType,
} from '../interfaces';

export class RegisterAnalyticsMetricDto {
  @IsString()
  workspaceId: string;

  @IsEnum(AnalyticsEntityType)
  entityType: AnalyticsEntityType;

  @IsString()
  metricKey: string;

  @IsString()
  name: string;

  @IsEnum(AnalyticsMetricType)
  metricType: AnalyticsMetricType;

  @IsString()
  aggregationFunction: string;

  @IsOptional()
  @IsString()
  sourceColumn?: string;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAnalyticsMetricDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  aggregationFunction?: string;

  @IsOptional()
  @IsString()
  sourceColumn?: string;

  @IsOptional()
  @IsString()
  formula?: string;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AnalyticsMetricResponseDto {
  id: string;
  workspaceId: string;
  entityType: AnalyticsEntityType;
  metricKey: string;
  name: string;
  metricType: AnalyticsMetricType;
  aggregationFunction: string;
  sourceColumn?: string;
  formula?: string;
  unit?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
