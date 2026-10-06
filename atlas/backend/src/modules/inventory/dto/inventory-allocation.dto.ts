import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryAllocationLineStatus,
  InventoryAllocationSource,
  InventoryAllocationStatus,
  InventoryAllocationStrategy,
  InventoryOwnershipType,
} from '../interfaces';

export class AllocateInventoryDto {
  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsEnum(InventoryAllocationSource)
  source?: InventoryAllocationSource;

  @IsOptional()
  @IsString()
  sourceReferenceType?: string;

  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @IsNumber()
  @Min(0.000001)
  quantity!: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsEnum(InventoryAllocationStrategy)
  strategy?: InventoryAllocationStrategy;

  @IsOptional()
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsString()
  referenceWarehouseId?: string;

  @IsOptional()
  @IsEnum(InventoryOwnershipType)
  restrictOwnershipType?: InventoryOwnershipType;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ReallocateInventoryDto {
  @IsOptional()
  @IsEnum(InventoryAllocationStrategy)
  strategy?: InventoryAllocationStrategy;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  warehouseIds?: string[];

  @IsOptional()
  @IsString()
  referenceWarehouseId?: string;

  @IsOptional()
  @IsEnum(InventoryOwnershipType)
  restrictOwnershipType?: InventoryOwnershipType;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReleaseAllocationDto {
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  quantity?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelAllocationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryAllocationFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryAllocationStatus)
  status?: InventoryAllocationStatus;

  @IsOptional()
  @IsEnum(InventoryAllocationSource)
  source?: InventoryAllocationSource;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  sourceReferenceType?: string;

  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class InventoryAllocationLineResponseDto {
  id!: string;
  allocationId!: string;
  workspaceId!: string;
  reservationId?: string | null;
  warehouseId!: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  ownershipType!: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity!: number;
  score?: number | null;
  reason?: string | null;
  status!: InventoryAllocationLineStatus;

  static from(raw: Record<string, unknown>): InventoryAllocationLineResponseDto {
    const dto = new InventoryAllocationLineResponseDto();
    dto.id = raw['id'] as string;
    dto.allocationId = raw['allocationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.reservationId = (raw['reservationId'] as string | null) ?? null;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.ownershipType = raw['ownershipType'] as InventoryOwnershipType;
    dto.ownerRef = (raw['ownerRef'] as string | null) ?? null;
    dto.quantity = raw['quantity'] as number;
    dto.score = (raw['score'] as number | null) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.status = raw['status'] as InventoryAllocationLineStatus;
    return dto;
  }
}

export class InventoryAllocationResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  source!: InventoryAllocationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  strategy!: InventoryAllocationStrategy;
  status!: InventoryAllocationStatus;
  priority!: number;
  requestedQuantity!: number;
  allocatedQuantity!: number;
  releasedQuantity!: number;
  shortageQuantity!: number;
  uom!: string;
  @ApiPropertyOptional({ enum: InventoryOwnershipType, nullable: true })
  restrictOwnershipType?: InventoryOwnershipType | null;
  reallocationCount!: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  lines?: InventoryAllocationLineResponseDto[];

  static from(
    raw: Record<string, unknown>,
    lines?: Record<string, unknown>[],
  ): InventoryAllocationResponseDto {
    const dto = new InventoryAllocationResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.source = raw['source'] as InventoryAllocationSource;
    dto.sourceReferenceType = (raw['sourceReferenceType'] as string | null) ?? null;
    dto.sourceReferenceId = (raw['sourceReferenceId'] as string | null) ?? null;
    dto.strategy = raw['strategy'] as InventoryAllocationStrategy;
    dto.status = raw['status'] as InventoryAllocationStatus;
    dto.priority = raw['priority'] as number;
    dto.requestedQuantity = raw['requestedQuantity'] as number;
    dto.allocatedQuantity = raw['allocatedQuantity'] as number;
    dto.releasedQuantity = raw['releasedQuantity'] as number;
    dto.shortageQuantity = Math.max(
      0,
      dto.requestedQuantity - dto.allocatedQuantity - dto.releasedQuantity,
    );
    dto.uom = raw['uom'] as string;
    dto.restrictOwnershipType = (raw['restrictOwnershipType'] as InventoryOwnershipType | null) ?? null;
    dto.reallocationCount = raw['reallocationCount'] as number;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    if (lines) dto.lines = lines.map(InventoryAllocationLineResponseDto.from);
    return dto;
  }
}

export class InventoryAllocationListResponseDto {
  data!: InventoryAllocationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryAllocationListResponseDto {
    const dto = new InventoryAllocationListResponseDto();
    dto.data = items.map((item) => InventoryAllocationResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryAllocationHistoryResponseDto {
  id!: string;
  allocationId!: string;
  workspaceId!: string;
  @ApiPropertyOptional({ enum: InventoryAllocationStatus, nullable: true })
  fromStatus?: InventoryAllocationStatus | null;
  toStatus!: InventoryAllocationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryAllocationHistoryResponseDto {
    const dto = new InventoryAllocationHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.allocationId = raw['allocationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryAllocationStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryAllocationStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
