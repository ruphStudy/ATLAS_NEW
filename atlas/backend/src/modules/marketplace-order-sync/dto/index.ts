import { IsString, IsEnum, IsOptional, IsObject, IsNumber, Min, IsBoolean, IsArray } from 'class-validator';
import {
  ConflictStrategy,
  IOrderSyncJob,
  IOrderSyncSchedule,
  OrderItemType,
  SyncDirection,
  SyncJobStatus,
  SyncScope,
  SyncTrigger,
} from '../interfaces';

export class StartOrderSyncRequestDto {
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

  @IsEnum(OrderItemType)
  @IsOptional()
  itemType?: OrderItemType;

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

export class RetryFailedOrderItemsRequestDto {
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

export class OrderSyncJobFilterQueryDto {
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
  jobId?: string | null;

  @IsString()
  @IsOptional()
  accountId?: string | null;

  @IsBoolean()
  @IsOptional()
  resolved?: boolean | null;

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
  @IsOptional()
  resolvedBy?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class CreateOrderScheduleRequestDto {
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

  @IsEnum(OrderItemType)
  @IsOptional()
  itemType?: OrderItemType;

  @IsEnum(ConflictStrategy)
  @IsOptional()
  conflictStrategy?: ConflictStrategy;

  @IsNumber()
  @Min(60000)
  intervalMs!: number;

  @IsObject()
  @IsOptional()
  filterOptions?: Record<string, unknown> | null;

  @IsString()
  @IsOptional()
  createdBy?: string | null;
}

export class UpdateOrderScheduleRequestDto {
  @IsNumber()
  @Min(60000)
  @IsOptional()
  intervalMs?: number;

  @IsBoolean()
  @IsOptional()
  enabled?: boolean;

  @IsEnum(ConflictStrategy)
  @IsOptional()
  conflictStrategy?: ConflictStrategy;
}

export class OrderSyncJobResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: OrderItemType;
  trigger!: SyncTrigger;
  status!: SyncJobStatus;
  conflictStrategy!: ConflictStrategy | null;
  filterOptions!: Record<string, unknown> | null;
  scheduleId!: string | null;
  correlationId!: string;
  cursor!: string | null;
  totalItems!: number | null;
  processedItems!: number;
  importedOrders!: number;
  updatedOrders!: number;
  cancelledOrders!: number;
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

  static from(job: IOrderSyncJob): OrderSyncJobResponseDto {
    const dto = new OrderSyncJobResponseDto();
    Object.assign(dto, job);
    return dto;
  }
}

export class PaginatedOrderSyncJobResponseDto {
  items!: OrderSyncJobResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class OrderScheduleResponseDto {
  id!: string;
  workspaceId!: string;
  accountId!: string;
  providerKey!: string;
  marketplaceKey!: string;
  direction!: SyncDirection;
  scope!: SyncScope;
  itemType!: OrderItemType;
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

  static from(schedule: IOrderSyncSchedule): OrderScheduleResponseDto {
    const dto = new OrderScheduleResponseDto();
    Object.assign(dto, schedule);
    return dto;
  }
}
