import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
} from 'class-validator';
import { AnalyticsEntityType } from '../interfaces';

export class CreateAnalyticsConfigurationDto {
  @IsString()
  workspaceId: string;

  @IsString()
  configKey: string;

  @IsOptional()
  @IsEnum(AnalyticsEntityType)
  entityType?: AnalyticsEntityType;

  @IsObject()
  configData: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateAnalyticsConfigurationDto {
  @IsOptional()
  @IsObject()
  configData?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class AnalyticsConfigurationResponseDto {
  id: string;
  workspaceId: string;
  configKey: string;
  entityType?: AnalyticsEntityType;
  configData: Record<string, any>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
