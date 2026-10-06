import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryOwnershipType,
  InventoryStockStatus,
  InventoryTransactionStatus,
  InventoryTransactionType,
} from '../interfaces';

export class ReceiveStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  @IsEnum(InventoryOwnershipType)
  ownershipType?: InventoryOwnershipType;

  @IsOptional()
  @IsString()
  ownerRef?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class IssueStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  @IsEnum(InventoryOwnershipType)
  ownershipType?: InventoryOwnershipType;

  @IsOptional()
  @IsString()
  ownerRef?: string;

  @IsOptional()
  @IsEnum(InventoryStockStatus)
  fromStockStatus?: InventoryStockStatus;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class TransferStockDto {
  @IsString()
  fromWarehouseId!: string;

  @IsOptional()
  @IsString()
  fromLocationId?: string;

  @IsString()
  toWarehouseId!: string;

  @IsOptional()
  @IsString()
  toLocationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class AdjustStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsEnum(InventoryStockStatus)
  status!: InventoryStockStatus;

  @IsNumber()
  quantityDelta!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ReserveStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ReleaseStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ChangeStockStatusDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  reason?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

/** Moves stock between locations/bins and/or statuses within a single warehouse. */
export class MoveStockDto {
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

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  reason?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class DispatchStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  @IsEnum(InventoryStockStatus)
  fromStockStatus?: InventoryStockStatus;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReturnStockDto {
  @IsString()
  warehouseId!: string;

  @IsOptional()
  @IsString()
  locationId?: string;

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
  @IsEnum(InventoryStockStatus)
  toStockStatus?: InventoryStockStatus;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  externalReference?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReverseTransactionDto {
  @IsString()
  reason!: string;
}

export class InventoryStockFilterDto extends PaginationDto {
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsEnum(InventoryStockStatus)
  status?: InventoryStockStatus;

  @IsOptional()
  @IsEnum(InventoryOwnershipType)
  ownershipType?: InventoryOwnershipType;
}

export class InventoryTransactionFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryTransactionType)
  type?: InventoryTransactionType;

  @IsOptional()
  @IsEnum(InventoryTransactionStatus)
  status?: InventoryTransactionStatus;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  serialId?: string;

  @IsOptional()
  @IsString()
  referenceType?: string;

  @IsOptional()
  @IsString()
  referenceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}

export class InventoryStockResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  warehouseId!: string;
  locationId?: string | null;
  batchId?: string | null;
  status!: InventoryStockStatus;
  ownershipType!: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity!: number;
  uom!: string;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryStockResponseDto {
    const dto = new InventoryStockResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.status = raw['status'] as InventoryStockStatus;
    dto.ownershipType = raw['ownershipType'] as InventoryOwnershipType;
    dto.ownerRef = (raw['ownerRef'] as string | null) ?? null;
    dto.quantity = raw['quantity'] as number;
    dto.uom = raw['uom'] as string;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryStockListResponseDto {
  data!: InventoryStockResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryStockListResponseDto {
    const dto = new InventoryStockListResponseDto();
    dto.data = items.map(InventoryStockResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryTransactionResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  ownershipType!: InventoryOwnershipType;
  ownerRef?: string | null;
  type!: string;
  status!: InventoryTransactionStatus;
  quantity!: number;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  uom!: string;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  referenceType?: string | null;
  referenceId?: string | null;
  externalReference?: string | null;
  idempotencyKey?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  reversalOfId?: string | null;
  reversedAt?: Date | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryTransactionResponseDto {
    const dto = new InventoryTransactionResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.warehouseId = (raw['warehouseId'] as string | null) ?? null;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.ownershipType = raw['ownershipType'] as InventoryOwnershipType;
    dto.ownerRef = (raw['ownerRef'] as string | null) ?? null;
    dto.type = raw['type'] as string;
    dto.status = raw['status'] as InventoryTransactionStatus;
    dto.quantity = raw['quantity'] as number;
    dto.quantityBefore = (raw['quantityBefore'] as number | null) ?? null;
    dto.quantityAfter = (raw['quantityAfter'] as number | null) ?? null;
    dto.uom = raw['uom'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryStockStatus | null) ?? null;
    dto.toStatus = (raw['toStatus'] as InventoryStockStatus | null) ?? null;
    dto.referenceType = (raw['referenceType'] as string | null) ?? null;
    dto.referenceId = (raw['referenceId'] as string | null) ?? null;
    dto.externalReference = (raw['externalReference'] as string | null) ?? null;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.performedBy = (raw['performedBy'] as string | null) ?? null;
    dto.reversalOfId = (raw['reversalOfId'] as string | null) ?? null;
    dto.reversedAt = (raw['reversedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class InventoryTransactionListResponseDto {
  data!: InventoryTransactionResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryTransactionListResponseDto {
    const dto = new InventoryTransactionListResponseDto();
    dto.data = items.map(InventoryTransactionResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
