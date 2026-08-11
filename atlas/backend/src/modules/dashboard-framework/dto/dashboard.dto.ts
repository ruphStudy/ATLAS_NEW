import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsObject,
  IsNumber,
  IsDate,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DashboardStatus,
  RefreshInterval,
  IDashboardLayout,
} from '../interfaces';

export class CreateDashboardDto {
  @IsString()
  workspaceId: string;

  @IsString()
  dashboardKey: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DashboardStatus)
  status?: DashboardStatus;

  @IsObject()
  layout: IDashboardLayout;

  @IsOptional()
  @IsString()
  templateId?: string;

  @IsOptional()
  @IsBoolean()
  isTemplate?: boolean;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsOptional()
  @IsEnum(RefreshInterval)
  refreshInterval?: RefreshInterval;

  @IsOptional()
  @IsObject()
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @IsString()
  createdBy: string;
}

export class UpdateDashboardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DashboardStatus)
  status?: DashboardStatus;

  @IsOptional()
  @IsObject()
  layout?: IDashboardLayout;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsOptional()
  @IsEnum(RefreshInterval)
  refreshInterval?: RefreshInterval;

  @IsOptional()
  @IsObject()
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CloneDashboardDto {
  @IsString()
  workspaceId: string;

  @IsString()
  dashboardKey: string;

  @IsString()
  name: string;

  @IsString()
  createdBy: string;
}

export class DashboardResponseDto {
  id: string;
  workspaceId: string;
  dashboardKey: string;
  name: string;
  description?: string;
  status: DashboardStatus;
  layout: IDashboardLayout;
  templateId?: string;
  isTemplate: boolean;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  refreshInterval: RefreshInterval;
  permissions?: {
    roles?: string[];
    userIds?: string[];
  };
  metadata?: Record<string, any>;
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  archivedAt?: Date;
}
