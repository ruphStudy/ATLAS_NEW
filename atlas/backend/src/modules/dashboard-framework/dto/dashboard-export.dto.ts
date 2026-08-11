import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDate,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExportDashboardDto {
  @IsString()
  dashboardId: string;

  @IsString()
  workspaceId: string;

  @IsEnum(['json', 'csv', 'pdf', 'xlsx'])
  exportFormat: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @IsOptional()
  @IsObject()
  dateRange?: {
    start: Date;
    end: Date;
  };

  @IsString()
  createdBy: string;
}

export class DashboardExportResponseDto {
  id: string;
  dashboardId: string;
  workspaceId: string;
  exportFormat: string;
  filters?: Record<string, any>;
  dateRange?: {
    start: Date;
    end: Date;
  };
  fileUrl?: string;
  status: string;
  createdBy: string;
  createdAt: Date;
}

export class DashboardVersionResponseDto {
  id: string;
  dashboardId: string;
  version: number;
  layout: any;
  filters?: Record<string, any>;
  widgets: any[];
  changeDescription?: string;
  createdBy: string;
  createdAt: Date;
}
