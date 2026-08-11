import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import {
  ConflictStrategy,
  IListingSyncJob,
  IListingSyncSchedule,
  ListingItemType,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from '../interfaces';

// ── Request DTOs ──────────────────────────────────────────────

export class StartListingSyncRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(ListingItemType) itemType?: ListingItemType;
  @IsOptional() @IsEnum(SyncTrigger) trigger?: SyncTrigger;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() scheduleId?: string | null;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class ListingSyncJobFilterQueryDto {
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

export class CreateListingScheduleRequestDto {
  @IsString() workspaceId!: string;
  @IsString() accountId!: string;
  @IsString() providerKey!: string;
  @IsString() marketplaceKey!: string;
  @IsOptional() @IsEnum(SyncDirection) direction?: SyncDirection;
  @IsOptional() @IsEnum(SyncScope) scope?: SyncScope;
  @IsOptional() @IsEnum(ListingItemType) itemType?: ListingItemType;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
  @IsInt() @Min(60000) intervalMs!: number;
  @IsOptional() filterOptions?: Record<string, unknown> | null;
  @IsOptional() @IsString() createdBy?: string | null;
}

export class UpdateListingScheduleRequestDto {
  @IsOptional() @IsInt() @Min(60000) intervalMs?: number;
  @IsOptional() enabled?: boolean;
  @IsOptional() @IsEnum(ConflictStrategy) conflictStrategy?: ConflictStrategy;
}

export class RetryFailedListingItemsRequestDto {
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

// ── Response DTOs ─────────────────────────────────────────────

export class ListingSyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: ListingItemType;
  trigger!: SyncTrigger;
  status!: SyncJobStatus;
  scheduledAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  cursor?: string | null;
  totalItems!: number;
  processedItems!: number;
  createdItems!: number;
  updatedItems!: number;
  pausedItems!: number;
  activatedItems!: number;
  deletedItems!: number;
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

  static from(job: IListingSyncJob): ListingSyncJobResponseDto {
    const dto = new ListingSyncJobResponseDto();
    Object.assign(dto, job);
    return dto;
  }
}

export class PaginatedListingSyncJobResponseDto {
  items!: ListingSyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ListingScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: ListingItemType;
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

  static from(schedule: IListingSyncSchedule): ListingScheduleResponseDto {
    const dto = new ListingScheduleResponseDto();
    Object.assign(dto, schedule);
    return dto;
  }
}
