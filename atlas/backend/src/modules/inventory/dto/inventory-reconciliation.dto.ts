import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryReconciliationClassification,
  InventoryReconciliationFindingStatus,
  InventoryReconciliationSourceType,
  InventoryReconciliationStatus,
  InventoryReconciliationTrigger,
  InventoryReconciliationVarianceType,
  InventoryStockStatus,
} from '../interfaces';

export class ReconciliationLineInputDto {
  @IsString()
  inventoryItemId!: string;

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
  status?: InventoryStockStatus;

  @IsNumber()
  countedQuantity!: number;

  @IsOptional()
  @IsNumber()
  unitCost?: number;
}

export class CreateReconciliationRunDto {
  @IsEnum(InventoryReconciliationSourceType)
  sourceType!: InventoryReconciliationSourceType;

  @IsOptional()
  @IsEnum(InventoryReconciliationTrigger)
  trigger?: InventoryReconciliationTrigger;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  scopeWarehouseId?: string;

  @IsDateString()
  periodStart!: string;

  @IsDateString()
  periodEnd!: string;

  @IsOptional()
  @IsString()
  sourceReferenceType?: string;

  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReconciliationLineInputDto)
  lines!: ReconciliationLineInputDto[];

  // When true (default) and `inventoryItemId` is set, also flags system buckets
  // that were not included in `lines` at all and haven't moved in a while.
  @IsOptional()
  @IsBoolean()
  detectStale?: boolean;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CancelReconciliationRunDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ApproveReconciliationLineDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectReconciliationLineDto {
  @IsString()
  reason!: string;
}

export class IgnoreReconciliationLineDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ResolveReconciliationLineDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReopenReconciliationLineDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryReconciliationRunFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryReconciliationStatus)
  status?: InventoryReconciliationStatus;

  @IsOptional()
  @IsEnum(InventoryReconciliationSourceType)
  sourceType?: InventoryReconciliationSourceType;

  @IsOptional()
  @IsEnum(InventoryReconciliationTrigger)
  trigger?: InventoryReconciliationTrigger;

  @IsOptional()
  @IsString()
  inventoryItemId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class InventoryReconciliationLineFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryReconciliationClassification)
  classification?: InventoryReconciliationClassification;

  @IsOptional()
  @IsEnum(InventoryReconciliationFindingStatus)
  findingStatus?: InventoryReconciliationFindingStatus;

  @IsOptional()
  @IsEnum(InventoryReconciliationVarianceType)
  varianceType?: InventoryReconciliationVarianceType;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class InventoryReconciliationLineResponseDto {
  id!: string;
  runId!: string;
  workspaceId!: string;
  inventoryItemId!: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId!: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  status!: InventoryStockStatus;
  systemQuantity!: number;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  unitCost?: number | null;
  varianceValue?: number | null;
  varianceType!: InventoryReconciliationVarianceType;
  classification!: InventoryReconciliationClassification;
  findingStatus!: InventoryReconciliationFindingStatus;
  adjustmentId?: string | null;
  reason?: string | null;
  notes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryReconciliationLineResponseDto {
    const dto = new InventoryReconciliationLineResponseDto();
    dto.id = raw['id'] as string;
    dto.runId = raw['runId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.sku = (raw['sku'] as string | null) ?? null;
    dto.catalogProductId = (raw['catalogProductId'] as string | null) ?? null;
    dto.variantId = (raw['variantId'] as string | null) ?? null;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialId = (raw['serialId'] as string | null) ?? null;
    dto.status = raw['status'] as InventoryStockStatus;
    dto.systemQuantity = raw['systemQuantity'] as number;
    dto.countedQuantity = (raw['countedQuantity'] as number | null) ?? null;
    dto.varianceQuantity = (raw['varianceQuantity'] as number | null) ?? null;
    dto.unitCost = (raw['unitCost'] as number | null) ?? null;
    dto.varianceValue = (raw['varianceValue'] as number | null) ?? null;
    dto.varianceType = raw['varianceType'] as InventoryReconciliationVarianceType;
    dto.classification = raw['classification'] as InventoryReconciliationClassification;
    dto.findingStatus = raw['findingStatus'] as InventoryReconciliationFindingStatus;
    dto.adjustmentId = (raw['adjustmentId'] as string | null) ?? null;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.resolvedBy = (raw['resolvedBy'] as string | null) ?? null;
    dto.resolvedAt = (raw['resolvedAt'] as Date | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryReconciliationLineListResponseDto {
  data!: InventoryReconciliationLineResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryReconciliationLineListResponseDto {
    const dto = new InventoryReconciliationLineListResponseDto();
    dto.data = items.map(InventoryReconciliationLineResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryReconciliationRunResponseDto {
  id!: string;
  workspaceId!: string;
  sourceType!: InventoryReconciliationSourceType;
  trigger!: InventoryReconciliationTrigger;
  status!: InventoryReconciliationStatus;
  inventoryItemId?: string | null;
  scopeWarehouseId?: string | null;
  periodStart!: Date;
  periodEnd!: Date;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  totalLines!: number;
  matchedCount!: number;
  warningCount!: number;
  criticalCount!: number;
  unresolvedCount!: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  lines?: InventoryReconciliationLineResponseDto[];

  static from(
    raw: Record<string, unknown>,
    lines?: Record<string, unknown>[],
  ): InventoryReconciliationRunResponseDto {
    const dto = new InventoryReconciliationRunResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.sourceType = raw['sourceType'] as InventoryReconciliationSourceType;
    dto.trigger = raw['trigger'] as InventoryReconciliationTrigger;
    dto.status = raw['status'] as InventoryReconciliationStatus;
    dto.inventoryItemId = (raw['inventoryItemId'] as string | null) ?? null;
    dto.scopeWarehouseId = (raw['scopeWarehouseId'] as string | null) ?? null;
    dto.periodStart = raw['periodStart'] as Date;
    dto.periodEnd = raw['periodEnd'] as Date;
    dto.sourceReferenceType = (raw['sourceReferenceType'] as string | null) ?? null;
    dto.sourceReferenceId = (raw['sourceReferenceId'] as string | null) ?? null;
    dto.totalLines = raw['totalLines'] as number;
    dto.matchedCount = raw['matchedCount'] as number;
    dto.warningCount = raw['warningCount'] as number;
    dto.criticalCount = raw['criticalCount'] as number;
    dto.unresolvedCount = raw['unresolvedCount'] as number;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    if (lines) dto.lines = lines.map(InventoryReconciliationLineResponseDto.from);
    return dto;
  }
}

export class InventoryReconciliationRunListResponseDto {
  data!: InventoryReconciliationRunResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryReconciliationRunListResponseDto {
    const dto = new InventoryReconciliationRunListResponseDto();
    dto.data = items.map((item) => InventoryReconciliationRunResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryReconciliationHistoryResponseDto {
  id!: string;
  runId!: string;
  workspaceId!: string;
  @ApiPropertyOptional({ enum: InventoryReconciliationStatus, nullable: true })
  fromStatus?: InventoryReconciliationStatus | null;
  toStatus!: InventoryReconciliationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryReconciliationHistoryResponseDto {
    const dto = new InventoryReconciliationHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.runId = raw['runId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryReconciliationStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryReconciliationStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}

export class InventoryReconciliationLineHistoryResponseDto {
  id!: string;
  lineId!: string;
  workspaceId!: string;
  @ApiPropertyOptional({ enum: InventoryReconciliationFindingStatus, nullable: true })
  fromStatus?: InventoryReconciliationFindingStatus | null;
  toStatus!: InventoryReconciliationFindingStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryReconciliationLineHistoryResponseDto {
    const dto = new InventoryReconciliationLineHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.lineId = raw['lineId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryReconciliationFindingStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryReconciliationFindingStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
