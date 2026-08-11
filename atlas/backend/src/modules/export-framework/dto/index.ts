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
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  ExportType,
  ExportFormat,
  ExportMode,
  ExportStatus,
  IExportConfig,
  IExportRequest,
  IExportExecution,
  IBulkExport,
  IExportFile,
  IExportResult,
} from '../interfaces';

export class ExportConfigDto implements IExportConfig {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columns?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  columnOrder?: string[];

  @IsObject()
  @IsOptional()
  formatting?: {
    locale?: string;
    timezone?: string;
    currency?: string;
    dateFormat?: string;
    numberFormat?: string;
  };

  @IsArray()
  @IsOptional()
  filters?: any[];

  @IsObject()
  @IsOptional()
  dateRange?: {
    start: Date;
    end: Date;
    presetKey?: string;
  };

  @IsArray()
  @IsOptional()
  grouping?: any[];

  @IsArray()
  @IsOptional()
  sorting?: any[];

  @IsBoolean()
  @IsOptional()
  includeCalculatedFields?: boolean;

  @IsBoolean()
  @IsOptional()
  includeHeaders?: boolean;

  @IsBoolean()
  @IsOptional()
  includeMetadata?: boolean;

  @IsNumber()
  @IsOptional()
  @Min(1)
  pageSize?: number;
}

export class CreateExportRequestDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  exportKey: string;

  @IsEnum(ExportType)
  @IsNotEmpty()
  type: ExportType;

  @IsEnum(ExportFormat)
  @IsNotEmpty()
  format: ExportFormat;

  @IsEnum(ExportMode)
  @IsOptional()
  mode?: ExportMode;

  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsString()
  @IsNotEmpty()
  sourceName: string;

  @ValidateNested()
  @Type(() => ExportConfigDto)
  @IsOptional()
  config?: ExportConfigDto;

  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  priority?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @IsObject()
  @IsOptional()
  retryBackoff?: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };

  @IsString()
  @IsOptional()
  scheduledExportId?: string;

  @IsString()
  @IsOptional()
  bulkExportId?: string;

  @IsString()
  @IsOptional()
  requestedBy?: string;
}

export class CreateBulkExportDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsNotEmpty()
  bulkKey: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateExportRequestDto)
  @IsNotEmpty()
  exports: CreateExportRequestDto[];

  @IsString()
  @IsOptional()
  requestedBy?: string;
}

export class ExportFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsEnum(ExportType)
  @IsOptional()
  type?: ExportType;

  @IsEnum(ExportFormat)
  @IsOptional()
  format?: ExportFormat;

  @IsEnum(ExportStatus)
  @IsOptional()
  status?: ExportStatus;

  @IsString()
  @IsOptional()
  sourceId?: string;

  @IsString()
  @IsOptional()
  scheduledExportId?: string;

  @IsString()
  @IsOptional()
  bulkExportId?: string;

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
  @Max(100)
  limit?: number;
}

export class ExecutionFilterDto {
  @IsString()
  @IsNotEmpty()
  workspaceId: string;

  @IsString()
  @IsOptional()
  exportRequestId?: string;

  @IsEnum(ExportStatus)
  @IsOptional()
  status?: ExportStatus;

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
  @Max(100)
  limit?: number;
}

export class ExportRequestResponseDto implements IExportRequest {
  id: string;
  workspaceId: string;
  exportKey: string;
  type: ExportType;
  format: ExportFormat;
  mode: ExportMode;
  status: ExportStatus;
  sourceId: string;
  sourceName: string;
  config: IExportConfig;
  idempotencyKey?: string;
  estimatedSize?: number;
  estimatedRows?: number;
  priority: number;
  maxRetries: number;
  retryCount: number;
  retryBackoff: {
    type: 'fixed' | 'exponential';
    initialDelayMs: number;
    maxDelayMs: number;
    multiplier?: number;
  };
  scheduledExportId?: string;
  bulkExportId?: string;
  requestedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExportExecutionResponseDto implements IExportExecution {
  id: string;
  exportRequestId: string;
  workspaceId: string;
  exportKey: string;
  status: ExportStatus;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number;
  progress?: number;
  progressMessage?: string;
  rowsProcessed?: number;
  rowsTotal?: number;
  fileSize?: number;
  filePath?: string;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  errorStack?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class BulkExportResponseDto implements IBulkExport {
  id: string;
  workspaceId: string;
  bulkKey: string;
  name: string;
  description?: string;
  exportRequestIds: string[];
  status: ExportStatus;
  totalExports: number;
  completedExports: number;
  failedExports: number;
  requestedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ExportFileResponseDto implements IExportFile {
  id: string;
  exportExecutionId: string;
  workspaceId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  format: ExportFormat;
  mimeType: string;
  downloadUrl: string;
  downloadExpiresAt: Date;
  downloadCount: number;
  maxDownloads?: number;
  retentionPolicy?: {
    deleteAfterDays: number;
    deleteAfterDownloads?: number;
  };
  isExpired: boolean;
  isDeleted: boolean;
  deletedAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export class ExportResultResponseDto implements IExportResult {
  exportRequestId: string;
  exportExecutionId: string;
  status: ExportStatus;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  fileSize?: number;
  rowsProcessed?: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export class PaginatedExportRequestResponseDto {
  data: ExportRequestResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class PaginatedExportExecutionResponseDto {
  data: ExportExecutionResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
