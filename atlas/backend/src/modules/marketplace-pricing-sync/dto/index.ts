import { IsString, IsEnum, IsOptional, IsObject, IsBoolean, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { SyncDirection, SyncMode, PriceItemType, SyncStatus, ItemSyncStatus, ConflictResolutionStrategy } from '../interfaces';

export class StartPriceSyncRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  accountId!: string;

  @IsString()
  providerKey!: string;

  @IsString()
  marketplaceKey!: string;

  @IsEnum(SyncDirection)
  direction!: SyncDirection;

  @IsEnum(SyncMode)
  mode!: SyncMode;

  @IsEnum(PriceItemType)
  itemType!: PriceItemType;

  @IsEnum(ConflictResolutionStrategy)
  conflictStrategy!: ConflictResolutionStrategy;

  @IsOptional()
  @IsString()
  cursor?: string;

  @IsOptional()
  @IsNumber()
  @Min(10)
  @Max(1000)
  batchSize?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RetryFailedPriceItemsRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  originalJobId!: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class CreatePriceScheduleRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  accountId!: string;

  @IsString()
  providerKey!: string;

  @IsString()
  marketplaceKey!: string;

  @IsEnum(SyncDirection)
  direction!: SyncDirection;

  @IsEnum(SyncMode)
  mode!: SyncMode;

  @IsEnum(PriceItemType)
  itemType!: PriceItemType;

  @IsEnum(ConflictResolutionStrategy)
  conflictStrategy!: ConflictResolutionStrategy;

  @IsString()
  cronExpression!: string;

  @IsBoolean()
  isActive!: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdatePriceScheduleRequestDto {
  @IsOptional()
  @IsEnum(SyncDirection)
  direction?: SyncDirection;

  @IsOptional()
  @IsEnum(SyncMode)
  mode?: SyncMode;

  @IsOptional()
  @IsEnum(PriceItemType)
  itemType?: PriceItemType;

  @IsOptional()
  @IsEnum(ConflictResolutionStrategy)
  conflictStrategy?: ConflictResolutionStrategy;

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

export class PriceSyncJobFilterQueryDto {
  @IsOptional()
  @IsString()
  workspaceId?: string;

  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsEnum(SyncStatus)
  status?: SyncStatus;

  @IsOptional()
  @IsEnum(SyncDirection)
  direction?: SyncDirection;

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
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  marketplaceId?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ConflictFilterQueryDto {
  @IsOptional()
  @IsString()
  accountId?: string;

  @IsOptional()
  @IsString()
  jobId?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isResolved?: boolean;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  limit?: number;
}

export class ConflictResolutionRequestDto {
  @IsString()
  resolution!: string;

  @IsString()
  resolvedBy!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class PriceSyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  mode!: SyncMode;
  status!: SyncStatus;
  itemType!: PriceItemType;
  startedAt?: Date;
  completedAt?: Date;
  totalItems!: number;
  processedItems!: number;
  successCount!: number;
  failedCount!: number;
  skippedCount!: number;
  conflictCount!: number;
  cursor?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(job: any): PriceSyncJobResponseDto {
    return {
      id: job.id,
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      marketplaceKey: job.marketplaceKey,
      direction: job.direction,
      mode: job.mode,
      status: job.status,
      itemType: job.itemType,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successCount: job.successCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      conflictCount: job.conflictCount,
      cursor: job.cursor,
      errorMessage: job.errorMessage,
      metadata: job.metadata,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
    };
  }
}

export class PaginatedPriceSyncJobResponseDto {
  items!: PriceSyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PriceScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  mode!: SyncMode;
  itemType!: PriceItemType;
  conflictStrategy!: ConflictResolutionStrategy;
  cronExpression!: string;
  isActive!: boolean;
  lastRunAt?: Date;
  nextRunAt?: Date;
  metadata?: Record<string, any>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(schedule: any): PriceScheduleResponseDto {
    return {
      id: schedule.id,
      workspaceId: schedule.workspaceId,
      accountId: schedule.accountId,
      providerKey: schedule.providerKey,
      marketplaceKey: schedule.marketplaceKey,
      direction: schedule.direction,
      mode: schedule.mode,
      itemType: schedule.itemType,
      conflictStrategy: schedule.conflictStrategy,
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
