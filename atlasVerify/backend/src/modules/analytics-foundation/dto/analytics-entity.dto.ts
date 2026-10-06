import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnalyticsEntityType } from '../interfaces';

export class RegisterAnalyticsEntityDto {
  @IsString()
  workspaceId: string;

  @IsEnum(AnalyticsEntityType)
  entityType: AnalyticsEntityType;

  @IsString()
  entityKey: string;

  @IsString()
  name: string;

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

export class UpdateAnalyticsEntityDto {
  @IsOptional()
  @IsString()
  name?: string;

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

export class AnalyticsEntityResponseDto {
  id: string;
  workspaceId: string;
  entityType: AnalyticsEntityType;
  entityKey: string;
  name: string;
  description?: string;
  metadata?: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
