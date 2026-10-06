import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import {
  AnalyticsEntityType,
  AnalyticsDimensionType,
} from '../interfaces';

export class RegisterAnalyticsDimensionDto {
  @IsString()
  workspaceId!: string;

  @IsEnum(AnalyticsEntityType)
  entityType!: AnalyticsEntityType;

  @IsString()
  dimensionKey!: string;

  @IsString()
  name!: string;

  @IsEnum(AnalyticsDimensionType)
  dimensionType!: AnalyticsDimensionType;

  @IsString()
  dataType!: string;

  @IsOptional()
  @IsString()
  sourceColumn?: string;

  @IsOptional()
  @IsString()
  transformFunction?: string;

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

export class UpdateAnalyticsDimensionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  sourceColumn?: string;

  @IsOptional()
  @IsString()
  transformFunction?: string;

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

export class AnalyticsDimensionResponseDto {
  id!: string;
  workspaceId!: string;
  entityType!: AnalyticsEntityType;
  dimensionKey!: string;
  name!: string;
  dimensionType!: AnalyticsDimensionType;
  dataType!: string;
  sourceColumn?: string;
  transformFunction?: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive!: boolean;
  createdAt!: Date;
  updatedAt!: Date;
}
