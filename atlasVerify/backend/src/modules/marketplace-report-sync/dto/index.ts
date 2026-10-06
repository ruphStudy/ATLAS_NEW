import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsNumber, Min, Max, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncMode, ReportType, SyncStatus, ItemSyncStatus, ReportStatus } from '../interfaces';

export class StartReportSyncRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  accountId: string;

  @IsString()
  providerKey: string;

  @IsString()
  marketplaceKey: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(SyncMode)
  mode: SyncMode;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(200)
  batchSize?: number;

  @IsOptional()
  @IsNumber()
  pollInterval?: number;

  @IsOptional()
  @IsNumber()
  maxPollAttempts?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RetryFailedReportItemsRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  originalJobId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreateReportScheduleRequestDto {
  @IsString()
  workspaceId: string;

  @IsString()
  accountId: string;

  @IsString()
  providerKey: string;

  @IsString()
  marketplaceKey: string;

  @IsEnum(ReportType)
  reportType: ReportType;

  @IsEnum(SyncMode)
  mode: SyncMode;

  @IsString()
  cronExpression: string;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateReportScheduleRequestDto {
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(SyncMode)
  mode?: SyncMode;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ReportSyncJobFilterQueryDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(SyncStatus)
  status?: SyncStatus;

  @IsOptional()
  @IsEnum(SyncMode)
  mode?: SyncMode;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ItemResultFilterQueryDto {
  @IsOptional()
  @IsEnum(ItemSyncStatus)
  status?: ItemSyncStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ExternalRefFilterQueryDto {
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ReportDocumentFilterQueryDto {
  @IsOptional()
  @IsEnum(ReportType)
  reportType?: ReportType;

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
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ReportSyncJobResponseDto {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  reportType: ReportType;
  mode: SyncMode;
  status: SyncStatus;
  startDate?: Date;
  endDate?: Date;
  startedAt?: Date;
  completedAt?: Date;
  totalReports: number;
  processedReports: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  cursor?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  static from(job: any): ReportSyncJobResponseDto {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      reportType: job.reportType,
      mode: job.mode,
      status: job.status,
      startDate: job.startDate,
      endDate: job.endDate,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      totalReports: job.totalReports,
      processedReports: job.processedReports,
      successCount: job.successCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      cursor: job.cursor,
      errorMessage: job.errorMessage,
      metadata: job.metadata,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

export class PaginatedReportSyncJobResponseDto {
  items: ReportSyncJobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ReportScheduleResponseDto {
  id: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  reportType: ReportType;
  mode: SyncMode;
  cronExpression: string;
  isActive: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;

  static from(schedule: any): ReportScheduleResponseDto {
    return {
      id: schedule.id,
      workspaceId: schedule.workspaceId,
      accountId: schedule.accountId,
      providerKey: schedule.providerKey,
      marketplaceKey: schedule.marketplaceKey,
      reportType: schedule.reportType,
      mode: schedule.mode,
      cronExpression: schedule.cronExpression,
      isActive: schedule.isActive,
      lastRunAt: schedule.lastRunAt,
      nextRunAt: schedule.nextRunAt,
      metadata: schedule.metadata,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
