import { Type } from 'class-transformer';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryStockStatus,
} from '../interfaces';

export class AdjustmentEvidenceDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsEnum(['image', 'document', 'video'])
  type?: 'image' | 'document' | 'video';
}

export class CreateAdjustmentDto {
  @IsString()
  inventoryItemId!: string;

  @IsEnum(InventoryAdjustmentType)
  type!: InventoryAdjustmentType;

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

  @IsOptional()
  @IsEnum(InventoryStockStatus)
  fromStatus?: InventoryStockStatus;

  @IsOptional()
  @IsEnum(InventoryStockStatus)
  toStatus?: InventoryStockStatus;

  // Magnitude, used by INCREASE / DECREASE / DAMAGE / LOSS / EXPIRY / STATUS_CORRECTION.
  @IsOptional()
  @IsNumber()
  quantity?: number;

  // Signed, used only by COUNT_VARIANCE.
  @IsOptional()
  @IsNumber()
  quantityDelta?: number;

  @IsOptional()
  @IsString()
  uom?: string;

  @IsOptional()
  @IsNumber()
  unitCost?: number;

  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  sourceReferenceType?: string;

  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdjustmentEvidenceDto)
  evidence?: AdjustmentEvidenceDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ApproveAdjustmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectAdjustmentDto {
  @IsString()
  reason!: string;
}

export class PostAdjustmentDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelAdjustmentDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReverseAdjustmentDto {
  @IsString()
  reason!: string;
}

export class InventoryAdjustmentFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryAdjustmentStatus)
  status?: InventoryAdjustmentStatus;

  @IsOptional()
  @IsEnum(InventoryAdjustmentType)
  type?: InventoryAdjustmentType;

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

export class InventoryAdjustmentResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  type!: InventoryAdjustmentType;
  status!: InventoryAdjustmentStatus;
  warehouseId!: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  quantity?: number | null;
  quantityDelta?: number | null;
  uom!: string;
  unitCost?: number | null;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  valueBefore?: number | null;
  valueAfter?: number | null;
  reason!: string;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  notes?: string | null;
  evidence?: AdjustmentEvidenceDto[];
  transactionId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  postedBy?: string | null;
  postedAt?: Date | null;
  reversedBy?: string | null;
  reversedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryAdjustmentResponseDto {
    const dto = new InventoryAdjustmentResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.type = raw['type'] as InventoryAdjustmentType;
    dto.status = raw['status'] as InventoryAdjustmentStatus;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.fromStatus = (raw['fromStatus'] as InventoryStockStatus | null) ?? null;
    dto.toStatus = (raw['toStatus'] as InventoryStockStatus | null) ?? null;
    dto.quantity = (raw['quantity'] as number | null) ?? null;
    dto.quantityDelta = (raw['quantityDelta'] as number | null) ?? null;
    dto.uom = raw['uom'] as string;
    dto.unitCost = (raw['unitCost'] as number | null) ?? null;
    dto.quantityBefore = (raw['quantityBefore'] as number | null) ?? null;
    dto.quantityAfter = (raw['quantityAfter'] as number | null) ?? null;
    dto.valueBefore = (raw['valueBefore'] as number | null) ?? null;
    dto.valueAfter = (raw['valueAfter'] as number | null) ?? null;
    dto.reason = raw['reason'] as string;
    dto.sourceReferenceType = (raw['sourceReferenceType'] as string | null) ?? null;
    dto.sourceReferenceId = (raw['sourceReferenceId'] as string | null) ?? null;
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.evidence = (raw['evidence'] as AdjustmentEvidenceDto[] | null) ?? [];
    dto.transactionId = (raw['transactionId'] as string | null) ?? null;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.approvedAt = (raw['approvedAt'] as Date | null) ?? null;
    dto.postedBy = (raw['postedBy'] as string | null) ?? null;
    dto.postedAt = (raw['postedAt'] as Date | null) ?? null;
    dto.reversedBy = (raw['reversedBy'] as string | null) ?? null;
    dto.reversedAt = (raw['reversedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryAdjustmentListResponseDto {
  data!: InventoryAdjustmentResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryAdjustmentListResponseDto {
    const dto = new InventoryAdjustmentListResponseDto();
    dto.data = items.map(InventoryAdjustmentResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryAdjustmentHistoryResponseDto {
  id!: string;
  adjustmentId!: string;
  workspaceId!: string;
  fromStatus?: InventoryAdjustmentStatus | null;
  toStatus!: InventoryAdjustmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryAdjustmentHistoryResponseDto {
    const dto = new InventoryAdjustmentHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.adjustmentId = raw['adjustmentId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryAdjustmentStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryAdjustmentStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
