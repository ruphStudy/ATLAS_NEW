import { IsEnum, IsNumber, IsObject, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InventoryMovementStatus, InventoryStockStatus } from '../interfaces';

export class CreateMovementDto {
  @IsString()
  inventoryItemId!: string;

  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  fromLocationId?: string;

  @IsOptional()
  @IsString()
  toLocationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  serialId?: string;

  @IsEnum(InventoryStockStatus)
  fromStatus!: InventoryStockStatus;

  @IsEnum(InventoryStockStatus)
  toStatus!: InventoryStockStatus;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ApproveMovementDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ExecuteMovementDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelMovementDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReverseMovementDto {
  @IsString()
  reason!: string;
}

export class InventoryMovementFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryMovementStatus)
  status?: InventoryMovementStatus;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class InventoryMovementResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId!: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus!: InventoryStockStatus;
  toStatus!: InventoryStockStatus;
  quantity!: number;
  uom!: string;
  status!: InventoryMovementStatus;
  reason!: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  executedBy?: string | null;
  executedAt?: Date | null;
  reversedBy?: string | null;
  reversedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryMovementResponseDto {
    const dto = new InventoryMovementResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.fromLocationId = (raw['fromLocationId'] as string | null) ?? null;
    dto.toLocationId = (raw['toLocationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.fromStatus = raw['fromStatus'] as InventoryStockStatus;
    dto.toStatus = raw['toStatus'] as InventoryStockStatus;
    dto.quantity = raw['quantity'] as number;
    dto.uom = raw['uom'] as string;
    dto.status = raw['status'] as InventoryMovementStatus;
    dto.reason = raw['reason'] as string;
    dto.referenceType = (raw['referenceType'] as string | null) ?? null;
    dto.referenceId = (raw['referenceId'] as string | null) ?? null;
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.transactionId = (raw['transactionId'] as string | null) ?? null;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.approvedAt = (raw['approvedAt'] as Date | null) ?? null;
    dto.executedBy = (raw['executedBy'] as string | null) ?? null;
    dto.executedAt = (raw['executedAt'] as Date | null) ?? null;
    dto.reversedBy = (raw['reversedBy'] as string | null) ?? null;
    dto.reversedAt = (raw['reversedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryMovementListResponseDto {
  data!: InventoryMovementResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryMovementListResponseDto {
    const dto = new InventoryMovementListResponseDto();
    dto.data = items.map(InventoryMovementResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryMovementHistoryResponseDto {
  id!: string;
  movementId!: string;
  workspaceId!: string;
  fromStatus?: InventoryMovementStatus | null;
  toStatus!: InventoryMovementStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryMovementHistoryResponseDto {
    const dto = new InventoryMovementHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.movementId = raw['movementId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryMovementStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryMovementStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
