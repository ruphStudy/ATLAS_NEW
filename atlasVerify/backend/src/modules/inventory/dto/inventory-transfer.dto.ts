import { IsArray, IsEnum, IsNumber, IsObject, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InventoryTransferStatus, InventoryTransferLineStatus, InventoryStockStatus } from '../interfaces';

export class CreateTransferLineDto {
  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  serialId?: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  sourceLocationId?: string;

  @IsOptional()
  @IsString()
  destinationLocationId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class CreateTransferDto {
  @IsString()
  sourceWarehouseId!: string;

  @IsString()
  destinationWarehouseId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTransferLineDto)
  lines!: CreateTransferLineDto[];

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
  shipmentReference?: string;

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

export class ApproveTransferDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class DispatchTransferDto {
  @IsOptional()
  @IsString()
  shipmentReference?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveTransferLineDto {
  @IsString()
  lineId!: string;

  @IsNumber()
  @Min(0.000001)
  receivedQuantity!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  damagedQuantity?: number;

  @IsOptional()
  @IsString()
  destinationLocationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReceiveTransferDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReceiveTransferLineDto)
  lines!: ReceiveTransferLineDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelTransferDto {
  @IsString()
  reason!: string;
}

export class ReverseTransferDto {
  @IsString()
  reason!: string;
}

export class InventoryTransferFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryTransferStatus)
  status?: InventoryTransferStatus;

  @IsOptional()
  @IsString()
  sourceWarehouseId?: string;

  @IsOptional()
  @IsString()
  destinationWarehouseId?: string;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class InventoryTransferLineResponseDto {
  id!: string;
  transferId!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  requestedQuantity!: number;
  dispatchedQuantity!: number;
  receivedQuantity!: number;
  damagedQuantity!: number;
  uom!: string;
  status!: InventoryTransferLineStatus;
  sourceLocationId?: string | null;
  destinationLocationId?: string | null;
  reservationId?: string | null;
  dispatchTransactionId?: string | null;
  receiveTransactionId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryTransferLineResponseDto {
    const dto = new InventoryTransferLineResponseDto();
    dto.id = raw['id'] as string;
    dto.transferId = raw['transferId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.requestedQuantity = raw['requestedQuantity'] as number;
    dto.dispatchedQuantity = raw['dispatchedQuantity'] as number;
    dto.receivedQuantity = raw['receivedQuantity'] as number;
    dto.damagedQuantity = raw['damagedQuantity'] as number;
    dto.uom = raw['uom'] as string;
    dto.status = raw['status'] as InventoryTransferLineStatus;
    dto.sourceLocationId = (raw['sourceLocationId'] as string | null) ?? null;
    dto.destinationLocationId = (raw['destinationLocationId'] as string | null) ?? null;
    dto.reservationId = (raw['reservationId'] as string | null) ?? null;
    dto.dispatchTransactionId = (raw['dispatchTransactionId'] as string | null) ?? null;
    dto.receiveTransactionId = (raw['receiveTransactionId'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryTransferResponseDto {
  id!: string;
  workspaceId!: string;
  transferNumber!: string;
  sourceWarehouseId!: string;
  destinationWarehouseId!: string;
  status!: InventoryTransferStatus;
  reason!: string;
  referenceType?: string | null;
  referenceId?: string | null;
  shipmentReference?: string | null;
  notes?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  dispatchedBy?: string | null;
  dispatchedAt?: Date | null;
  receivedBy?: string | null;
  receivedAt?: Date | null;
  reversedBy?: string | null;
  reversedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
  lines?: InventoryTransferLineResponseDto[];

  static from(raw: Record<string, unknown>): InventoryTransferResponseDto {
    const dto = new InventoryTransferResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.transferNumber = raw['transferNumber'] as string;
    dto.sourceWarehouseId = raw['sourceWarehouseId'] as string;
    dto.destinationWarehouseId = raw['destinationWarehouseId'] as string;
    dto.status = raw['status'] as InventoryTransferStatus;
    dto.reason = raw['reason'] as string;
    dto.referenceType = (raw['referenceType'] as string | null) ?? null;
    dto.referenceId = (raw['referenceId'] as string | null) ?? null;
    dto.shipmentReference = (raw['shipmentReference'] as string | null) ?? null;
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.approvedAt = (raw['approvedAt'] as Date | null) ?? null;
    dto.dispatchedBy = (raw['dispatchedBy'] as string | null) ?? null;
    dto.dispatchedAt = (raw['dispatchedAt'] as Date | null) ?? null;
    dto.receivedBy = (raw['receivedBy'] as string | null) ?? null;
    dto.receivedAt = (raw['receivedAt'] as Date | null) ?? null;
    dto.reversedBy = (raw['reversedBy'] as string | null) ?? null;
    dto.reversedAt = (raw['reversedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    if (raw['lines']) {
      dto.lines = (raw['lines'] as Record<string, unknown>[]).map(InventoryTransferLineResponseDto.from);
    }
    return dto;
  }
}

export class InventoryTransferListResponseDto {
  data!: InventoryTransferResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryTransferListResponseDto {
    const dto = new InventoryTransferListResponseDto();
    dto.data = items.map(InventoryTransferResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryTransferHistoryResponseDto {
  id!: string;
  transferId!: string;
  workspaceId!: string;
  fromStatus?: InventoryTransferStatus | null;
  toStatus!: InventoryTransferStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: Record<string, unknown> | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryTransferHistoryResponseDto {
    const dto = new InventoryTransferHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.transferId = raw['transferId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryTransferStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryTransferStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = (raw['snapshot'] as Record<string, unknown> | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
