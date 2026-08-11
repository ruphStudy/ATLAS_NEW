import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConflictStrategy,
  ICatalogSyncJob,
  ICatalogSyncSchedule,
  SyncDirection,
  SyncItemType,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from '../interfaces';

// ── Request DTOs ──────────────────────────────────────────

export class StartSyncRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(SyncItemType) itemType?: SyncItemType;
  @IsOptional() @IsEnum(SyncTrigger) trigger?: SyncTrigger;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() scheduleId?: string | null;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class SyncJobFilterQueryDto {
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsEnum(SyncJobStatus) status?: SyncJobStatus;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsString() providerKey?: string;
  @IsOptional() @IsString() marketplaceKey?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateScheduleRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(SyncItemType) itemType?: SyncItemType;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsInt() @Min(60000) intervalMs!: number;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class UpdateScheduleRequestDto {
  @IsOptional() @IsInt() @Min(60000) intervalMs?: number;
  @IsOptional() enabled?: boolean;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
}

export class RetryFailedItemsRequestDto {
  @IsString() workspaceId!: string;
  @IsString() jobId!: string;
  @IsOptional() @IsString({ each: true }) itemIds?: string[];
  @IsOptional() @IsString() createdBy?: string | null;
}

export class ConflictResolutionRequestDto {
  @IsString() resolution!: string;
  @IsOptional() @IsString() resolvedBy?: string;
  @IsOptional() @IsString() notes?: string;
}

export class ExternalRefFilterQueryDto {
  @IsOptional() @IsString() refType?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ItemResultFilterQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ConflictFilterQueryDto {
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() resolved?: boolean;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

// ── Response DTOs ─────────────────────────────────────────

export class SyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: string;
  scope!: string;
  itemType!: string;
  trigger!: string;
  status!: string;
  conflictStrategy!: string | null;
  correlationId!: string;
  scheduleId!: string | null;
  scheduledAt!: Date | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  cursor!: string | null;
  totalItems!: number;
  processedItems!: number;
  createdItems!: number;
  updatedItems!: number;
  deletedItems!: number;
  failedItems!: number;
  conflictItems!: number;
  skippedItems!: number;
  errorCode!: string | null;
  errorMessage!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(job: ICatalogSyncJob): SyncJobResponseDto {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      scope: job.scope,
      itemType: job.itemType,
      trigger: job.trigger,
      status: job.status,
      conflictStrategy: job.conflictStrategy ?? null,
      correlationId: job.correlationId,
      scheduleId: job.scheduleId ?? null,
      scheduledAt: job.scheduledAt ?? null,
      startedAt: job.startedAt ?? null,
      completedAt: job.completedAt ?? null,
      cursor: job.cursor ?? null,
      totalItems: job.totalItems ?? 0,
      processedItems: job.processedItems ?? 0,
      createdItems: job.createdItems ?? 0,
      updatedItems: job.updatedItems ?? 0,
      deletedItems: job.deletedItems ?? 0,
      failedItems: job.failedItems ?? 0,
      conflictItems: job.conflictItems ?? 0,
      skippedItems: job.skippedItems ?? 0,
      errorCode: job.errorCode ?? null,
      errorMessage: job.errorMessage ?? null,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

export class PaginatedSyncJobResponseDto {
  items!: SyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: string;
  scope!: string;
  itemType!: string;
  conflictStrategy!: string;
  intervalMs!: number;
  enabled!: boolean;
  lastRunAt!: Date | null;
  nextRunAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(schedule: ICatalogSyncSchedule): ScheduleResponseDto {
    return {
      id: schedule.id,
      workspaceId: schedule.workspaceId,
      accountId: schedule.accountId,
      providerKey: schedule.providerKey,
      marketplaceKey: schedule.marketplaceKey,
      direction: schedule.direction,
      scope: schedule.scope,
      itemType: schedule.itemType,
      conflictStrategy: schedule.conflictStrategy,
      intervalMs: schedule.intervalMs,
      enabled: schedule.enabled,
      lastRunAt: schedule.lastRunAt ?? null,
      nextRunAt: schedule.nextRunAt ?? null,
      createdAt: schedule.createdAt,
      updatedAt: schedule.updatedAt,
    };
  }
}
