import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConflictStrategy,
  IInventorySyncJob,
  IInventorySyncSchedule,
  InventoryItemType,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from '../interfaces';

// ── Request DTOs ──────────────────────────────────────────────

export class StartInventorySyncRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsString() warehouseId?: string | null;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(InventoryItemType) itemType?: InventoryItemType;
  @IsOptional() @IsEnum(SyncTrigger) trigger?: SyncTrigger;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() scheduleId?: string | null;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class InventorySyncJobFilterQueryDto {
  @IsOptional() @IsString() workspaceId?: string;
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() warehouseId?: string;
  @IsOptional() @IsEnum(SyncJobStatus) status?: SyncJobStatus;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsString() providerKey?: string;
  @IsOptional() @IsString() marketplaceKey?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class CreateInventoryScheduleRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsString() warehouseId?: string | null;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(InventoryItemType) itemType?: InventoryItemType;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsInt() @Min(60000) intervalMs!: number;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class UpdateInventoryScheduleRequestDto {
  @IsOptional() @IsInt() @Min(60000) intervalMs?: number;
  @IsOptional() enabled?: boolean;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
}

export class RetryFailedInventoryItemsRequestDto {
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

export class ItemResultFilterQueryDto {
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

export class ExternalRefFilterQueryDto {
  @IsOptional() @IsString() warehouseId?: string;
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

export class AdjustmentFilterQueryDto {
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

// ── Response DTOs ─────────────────────────────────────────

export class InventorySyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  warehouseId?: string | null;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: InventoryItemType;
  trigger!: SyncTrigger;
  status!: SyncJobStatus;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cursor?: string | null;
  totalItems!: number;
  processedItems!: number;
  pushedItems!: number;
  pulledItems!: number;
  adjustedItems!: number;
  reconciledItems!: number;
  failedItems!: number;
  conflictItems!: number;
  skippedItems!: number;
  errorCode?: string | null;
  errorMessage?: string | null;
  conflictStrategy?: ConflictStrategy | null;
  filterOptions?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  scheduleId?: string | null;
  correlationId!: string;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(job: IInventorySyncJob): InventorySyncJobResponseDto {
    const dto = new InventorySyncJobResponseDto();
    Object.assign(dto, job);
    return dto;
  }
}

export class PaginatedInventorySyncJobResponseDto {
  items!: InventorySyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class InventoryScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  warehouseId?: string | null;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: InventoryItemType;
  conflictStrategy?: ConflictStrategy | null;
  intervalMs!: number;
  enabled!: boolean;
  lastRunAt?: Date | null;
  nextRunAt?: Date | null;
  lastJobId?: string | null;
  filterOptions?: Record<string, unknown> | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(schedule: IInventorySyncSchedule): InventoryScheduleResponseDto {
    const dto = new InventoryScheduleResponseDto();
    Object.assign(dto, schedule);
    return dto;
  }
}
  @IsOptional() @IsString() accountId?: string;
  @IsOptional() @IsString() jobId?: string;
  @IsOptional() @IsString() status?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit?: number;
}

// ── Response DTOs ─────────────────────────────────────────────

export class InventorySyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  warehouseId!: string | null;
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
  pushedItems!: number;
  pulledItems!: number;
  adjustedItems!: number;
  reconciledItems!: number;
  failedItems!: number;
  conflictItems!: number;
  skippedItems!: number;
  errorCode!: string | null;
  errorMessage!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(job: IInventorySyncJob): InventorySyncJobResponseDto {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      warehouseId: job.warehouseId ?? null,
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
      pushedItems: job.pushedItems ?? 0,
      pulledItems: job.pulledItems ?? 0,
      adjustedItems: job.adjustedItems ?? 0,
      reconciledItems: job.reconciledItems ?? 0,
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

export class PaginatedInventorySyncJobResponseDto {
  items!: InventorySyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class InventoryScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  warehouseId!: string | null;
  direction!: string;
  scope!: string;
  itemType!: string;
  conflictStrategy!: string | null;
  intervalMs!: number;
  enabled!: boolean;
  lastRunAt!: Date | null;
  nextRunAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(s: IInventorySyncSchedule): InventoryScheduleResponseDto {
    return {
      id: s.id,
      workspaceId: s.workspaceId,
      accountId: s.accountId,
      providerKey: s.providerKey,
      marketplaceKey: s.marketplaceKey,
      warehouseId: s.warehouseId ?? null,
      direction: s.direction,
      scope: s.scope,
      itemType: s.itemType,
      conflictStrategy: s.conflictStrategy ?? null,
      intervalMs: s.intervalMs,
      enabled: s.enabled,
      lastRunAt: s.lastRunAt ?? null,
      nextRunAt: s.nextRunAt ?? null,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
