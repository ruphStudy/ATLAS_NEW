import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryOwnershipType,
  InventoryReservationLineStatus,
  InventoryReservationSource,
  InventoryReservationStatus,
} from '../interfaces';

export class ReservationLineInputDto {
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
}

export class CreateReservationDto {
  @IsString()
  inventoryItemId!: string;

  @IsOptional()
  @IsEnum(InventoryReservationSource)
  source?: InventoryReservationSource;

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
  @IsInt()
  priority?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  expiresInMinutes?: number;

  // Single-warehouse convenience form (mutually exclusive with `lines`).
  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  // Explicit split-across-warehouses form.
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReservationLineInputDto)
  lines?: ReservationLineInputDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ConfirmReservationDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReleaseReservationDto {
  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  quantity?: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelReservationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryReservationFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryReservationStatus)
  status?: InventoryReservationStatus;

  @IsOptional()
  @IsEnum(InventoryReservationSource)
  source?: InventoryReservationSource;

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

export class InventoryReservationLineResponseDto {
  id!: string;
  reservationId!: string;
  workspaceId!: string;
  warehouseId!: string;
  locationId?: string | null;
  batchId?: string | null;
  ownershipType!: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity!: number;
  status!: InventoryReservationLineStatus;

  static from(raw: Record<string, unknown>): InventoryReservationLineResponseDto {
    const dto = new InventoryReservationLineResponseDto();
    dto.id = raw['id'] as string;
    dto.reservationId = raw['reservationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.ownershipType = raw['ownershipType'] as InventoryOwnershipType;
    dto.ownerRef = (raw['ownerRef'] as string | null) ?? null;
    dto.quantity = raw['quantity'] as number;
    dto.status = raw['status'] as InventoryReservationLineStatus;
    return dto;
  }
}

export class InventoryReservationResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  source!: InventoryReservationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  status!: InventoryReservationStatus;
  priority!: number;
  requestedQuantity!: number;
  reservedQuantity!: number;
  releasedQuantity!: number;
  releasableQuantity!: number;
  uom!: string;
  expiresAt?: Date | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  lines?: InventoryReservationLineResponseDto[];

  static from(
    raw: Record<string, unknown>,
    lines?: Record<string, unknown>[],
  ): InventoryReservationResponseDto {
    const dto = new InventoryReservationResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.source = raw['source'] as InventoryReservationSource;
    dto.sourceReferenceType = (raw['sourceReferenceType'] as string | null) ?? null;
    dto.sourceReferenceId = (raw['sourceReferenceId'] as string | null) ?? null;
    dto.status = raw['status'] as InventoryReservationStatus;
    dto.priority = raw['priority'] as number;
    dto.requestedQuantity = raw['requestedQuantity'] as number;
    dto.reservedQuantity = raw['reservedQuantity'] as number;
    dto.releasedQuantity = raw['releasedQuantity'] as number;
    dto.releasableQuantity = raw['reservedQuantity'] as number;
    dto.uom = raw['uom'] as string;
    dto.expiresAt = (raw['expiresAt'] as Date | null) ?? null;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    if (lines) dto.lines = lines.map(InventoryReservationLineResponseDto.from);
    return dto;
  }
}

export class InventoryReservationListResponseDto {
  data!: InventoryReservationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryReservationListResponseDto {
    const dto = new InventoryReservationListResponseDto();
    dto.data = items.map((item) => InventoryReservationResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryReservationHistoryResponseDto {
  id!: string;
  reservationId!: string;
  workspaceId!: string;
  fromStatus?: InventoryReservationStatus | null;
  toStatus!: InventoryReservationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryReservationHistoryResponseDto {
    const dto = new InventoryReservationHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.reservationId = raw['reservationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryReservationStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryReservationStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
