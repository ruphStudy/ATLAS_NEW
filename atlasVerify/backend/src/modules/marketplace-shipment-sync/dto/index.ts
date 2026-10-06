import { IsString, IsEnum, IsOptional, IsObject, IsNumber, Min, IsBoolean, IsArray } from 'class-validator';
import {
  ConflictStrategy,
  IShipmentSyncJob,
  IShipmentSyncSchedule,
  ShipmentItemType,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from '../interfaces';

export class StartShipmentSyncRequestDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  accountId!: string;

  @IsString()
  providerKey!: string;

  @IsString()
  marketplaceKey!: string;

  @IsEnum(SyncDirection)
  @IsOptional()
  direction?: SyncDirection;

  @IsEnum(SyncScope)
  @IsOptional()
  scope?: SyncScope;

  @IsEnum(ShipmentItemType)
  @IsOptional()
  itemType?: ShipmentItemType;

  @IsEnum(SyncTrigger)
  @IsOptional()
  trigger?: SyncTrigger;

  @IsEnum(ConflictStrategy)
  @IsOptional()
  conflictStrategy?: ConflictStrategy;

  @IsObject()
  @IsOptional()
  filterOptions?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsString()
  @IsOptional()
  correlationId?: string;

  @IsString()
  @IsOptional()
  createdBy?: string | null;
}

export class RetryFailedShipmentItemsRequestDto {
  @IsString()
  jobId!: string;

  @IsString()
  workspaceId!: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  itemIds?: string[];

  @IsString()
  @IsOptional()
  createdBy?: string | null;
}

export class ShipmentSyncJobFilterQueryDto {
  @IsString()
  workspaceId!: string;

  @IsString()
  @IsOptional()
  accountId?: string;

  @IsString()
  @IsOptional()
  providerKey?: string;

  @IsString()
  @IsOptional()
  marketplaceKey?: string;

  @IsEnum(SyncJobStatus)
  @IsOptional()
  status?: SyncJobStatus;

  @IsEnum(SyncTrigger)
  @IsOptional()
  trigger?: SyncTrigger;

  @IsString()
  @IsOptional()
  scheduleId?: string;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ItemResultFilterQueryDto {
  @IsString()
  @IsOptional()
  status?: string | null;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ExternalRefFilterQueryDto {
  @IsString()
  @IsOptional()
  status?: string | null;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ConflictFilterQueryDto {
  @IsString()
  @IsOptional()
  accountId?: string;

  @IsBoolean()
  @IsOptional()
  resolved?: boolean;

  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;
}

export class ConflictResolutionRequestDto {
  @IsString()
  resolution!: string;

  @IsString()
  resolvedBy!: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateShipmentScheduleRequestDto {
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

  @IsEnum(SyncScope)
  scope!: SyncScope;

  @IsEnum(ShipmentItemType)
  itemType!: ShipmentItemType;

  @IsEnum(ConflictStrategy)
  @IsOptional()
  conflictStrategy?: ConflictStrategy;

  @IsNumber()
  @Min(60000)
  intervalMs!: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  filterOptions?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  createdBy?: string | null;
}

export class UpdateShipmentScheduleRequestDto {
  @IsEnum(SyncScope)
  @IsOptional()
  scope?: SyncScope;

  @IsEnum(ShipmentItemType)
  @IsOptional()
  itemType?: ShipmentItemType;

  @IsEnum(ConflictStrategy)
  @IsOptional()
  conflictStrategy?: ConflictStrategy;

  @IsNumber()
  @Min(60000)
  @IsOptional()
  intervalMs?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsObject()
  @IsOptional()
  filterOptions?: Record<string, unknown>;

  @IsString()
  @IsOptional()
  updatedBy?: string | null;
}

export class ShipmentSyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: ShipmentItemType;
  trigger!: SyncTrigger;
  status!: SyncJobStatus;
  conflictStrategy!: ConflictStrategy | null;
  filterOptions!: Record<string, unknown> | null;
  scheduleId!: string | null;
  correlationId!: string;
  cursor!: string | null;
  totalItems!: number | null;
  processedItems!: number;
  importedShipments!: number;
  updatedShipments!: number;
  cancelledShipments!: number;
  deliveredShipments!: number;
  failedItems!: number;
  conflictItems!: number;
  skippedItems!: number;
  errorCode!: string | null;
  errorMessage!: string | null;
  startedAt!: Date | null;
  completedAt!: Date | null;
  createdBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(job: IShipmentSyncJob): ShipmentSyncJobResponseDto {
    const dto = new ShipmentSyncJobResponseDto();
    Object.assign(dto, job);
    return dto;
  }
}

export class PaginatedShipmentSyncJobResponseDto {
  items!: ShipmentSyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class ShipmentScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: ShipmentItemType;
  conflictStrategy!: ConflictStrategy | null;
  intervalMs!: number;
  enabled!: boolean;
  lastRunAt!: Date | null;
  lastJobId!: string | null;
  nextRunAt!: Date | null;
  filterOptions!: Record<string, unknown> | null;
  createdBy!: string | null;
  updatedBy!: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(schedule: IShipmentSyncSchedule): ShipmentScheduleResponseDto {
    const dto = new ShipmentScheduleResponseDto();
    Object.assign(dto, schedule);
    delete (dto as any).deletedAt;
    return dto;
  }
}
