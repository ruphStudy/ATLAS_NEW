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
  IsUrl,
  ValidateNested,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '@common/dto/pagination.dto';
import {
  InventoryCycleCountLineStatus,
  InventoryCycleCountStatus,
  InventoryCycleCountType,
  InventoryStockStatus,
} from '../interfaces';

export class CycleCountEvidenceDto {
  @IsString()
  name!: string;

  @IsUrl()
  url!: string;

  @IsOptional()
  @IsEnum(['image', 'document', 'video'])
  type?: 'image' | 'document' | 'video';
}

export class CycleCountLineInputDto {
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
}

export class CreateCycleCountDto {
  @IsOptional()
  @IsEnum(InventoryCycleCountType)
  type?: InventoryCycleCountType;

  @IsOptional()
  @IsString()
  scopeWarehouseId?: string;

  @IsOptional()
  @IsString()
  scopeLocationId?: string;

  @IsOptional()
  @IsString()
  scopeInventoryItemId?: string;

  @IsOptional()
  @IsString()
  abcClass?: string;

  @IsOptional()
  @IsBoolean()
  isBlind?: boolean;

  @IsOptional()
  @IsBoolean()
  freezeStock?: boolean;

  @IsOptional()
  @IsArray()
  @IsEnum(InventoryStockStatus, { each: true })
  freezeStatuses?: InventoryStockStatus[];

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsString()
  sourceReferenceType?: string;

  @IsOptional()
  @IsString()
  sourceReferenceId?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CycleCountLineInputDto)
  lines!: CycleCountLineInputDto[];

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ScheduleCycleCountDto {
  @IsDateString()
  scheduledAt!: string;
}

export class AssignCycleCountDto {
  @IsString()
  assignedTo!: string;
}

export class StartCycleCountDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class PauseCycleCountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CompleteCycleCountDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ApproveCycleCountDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RejectCycleCountDto {
  @IsString()
  reason!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  lineIds?: string[];
}

export class CancelCycleCountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SubmitCycleCountLineDto {
  @IsNumber()
  countedQuantity!: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CycleCountEvidenceDto)
  evidence?: CycleCountEvidenceDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FlagRecountDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventoryCycleCountFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryCycleCountStatus)
  status?: InventoryCycleCountStatus;

  @IsOptional()
  @IsEnum(InventoryCycleCountType)
  type?: InventoryCycleCountType;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  assignedTo?: string;

  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class InventoryCycleCountLineFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryCycleCountLineStatus)
  lineStatus?: InventoryCycleCountLineStatus;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class InventoryCycleCountLineResponseDto {
  id!: string;
  cycleCountId!: string;
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
  expectedQuantity?: number | null;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  lineStatus!: InventoryCycleCountLineStatus;
  recountCount!: number;
  countedBy?: string | null;
  countedAt?: Date | null;
  evidence?: CycleCountEvidenceDto[];
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>, hideExpected = false): InventoryCycleCountLineResponseDto {
    const dto = new InventoryCycleCountLineResponseDto();
    dto.id = raw['id'] as string;
    dto.cycleCountId = raw['cycleCountId'] as string;
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
    dto.expectedQuantity = hideExpected ? null : ((raw['expectedQuantity'] as number | null) ?? null);
    dto.countedQuantity = (raw['countedQuantity'] as number | null) ?? null;
    dto.varianceQuantity = hideExpected ? null : ((raw['varianceQuantity'] as number | null) ?? null);
    dto.lineStatus = raw['lineStatus'] as InventoryCycleCountLineStatus;
    dto.recountCount = raw['recountCount'] as number;
    dto.countedBy = (raw['countedBy'] as string | null) ?? null;
    dto.countedAt = (raw['countedAt'] as Date | null) ?? null;
    dto.evidence = (raw['evidence'] as CycleCountEvidenceDto[] | null) ?? [];
    dto.notes = (raw['notes'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryCycleCountLineListResponseDto {
  data!: InventoryCycleCountLineResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
    hideExpected = false,
  ): InventoryCycleCountLineListResponseDto {
    const dto = new InventoryCycleCountLineListResponseDto();
    dto.data = items.map((item) => InventoryCycleCountLineResponseDto.from(item, hideExpected));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryCycleCountResponseDto {
  id!: string;
  workspaceId!: string;
  type!: InventoryCycleCountType;
  status!: InventoryCycleCountStatus;
  scopeWarehouseId?: string | null;
  scopeLocationId?: string | null;
  scopeInventoryItemId?: string | null;
  abcClass?: string | null;
  isBlind!: boolean;
  freezeStock!: boolean;
  freezeStatuses?: InventoryStockStatus[];
  scheduledAt?: Date | null;
  assignedTo?: string | null;
  assignedBy?: string | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  reconciliationRunId?: string | null;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  totalLines!: number;
  countedLines!: number;
  varianceLines!: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
  lines?: InventoryCycleCountLineResponseDto[];

  static from(
    raw: Record<string, unknown>,
    lines?: Record<string, unknown>[],
  ): InventoryCycleCountResponseDto {
    const dto = new InventoryCycleCountResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.type = raw['type'] as InventoryCycleCountType;
    dto.status = raw['status'] as InventoryCycleCountStatus;
    dto.scopeWarehouseId = (raw['scopeWarehouseId'] as string | null) ?? null;
    dto.scopeLocationId = (raw['scopeLocationId'] as string | null) ?? null;
    dto.scopeInventoryItemId = (raw['scopeInventoryItemId'] as string | null) ?? null;
    dto.abcClass = (raw['abcClass'] as string | null) ?? null;
    dto.isBlind = raw['isBlind'] as boolean;
    dto.freezeStock = raw['freezeStock'] as boolean;
    dto.freezeStatuses = (raw['freezeStatuses'] as InventoryStockStatus[] | null) ?? undefined;
    dto.scheduledAt = (raw['scheduledAt'] as Date | null) ?? null;
    dto.assignedTo = (raw['assignedTo'] as string | null) ?? null;
    dto.assignedBy = (raw['assignedBy'] as string | null) ?? null;
    dto.assignedAt = (raw['assignedAt'] as Date | null) ?? null;
    dto.startedAt = (raw['startedAt'] as Date | null) ?? null;
    dto.completedAt = (raw['completedAt'] as Date | null) ?? null;
    dto.approvedBy = (raw['approvedBy'] as string | null) ?? null;
    dto.approvedAt = (raw['approvedAt'] as Date | null) ?? null;
    dto.reconciliationRunId = (raw['reconciliationRunId'] as string | null) ?? null;
    dto.sourceReferenceType = (raw['sourceReferenceType'] as string | null) ?? null;
    dto.sourceReferenceId = (raw['sourceReferenceId'] as string | null) ?? null;
    dto.totalLines = raw['totalLines'] as number;
    dto.countedLines = raw['countedLines'] as number;
    dto.varianceLines = raw['varianceLines'] as number;
    dto.idempotencyKey = (raw['idempotencyKey'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown> | null) ?? null;
    dto.createdBy = (raw['createdBy'] as string | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    const hideExpected = dto.isBlind && dto.status !== InventoryCycleCountStatus.COMPLETED &&
      dto.status !== InventoryCycleCountStatus.APPROVED && dto.status !== InventoryCycleCountStatus.REJECTED;
    if (lines) dto.lines = lines.map((line) => InventoryCycleCountLineResponseDto.from(line, hideExpected));
    return dto;
  }
}

export class InventoryCycleCountListResponseDto {
  data!: InventoryCycleCountResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryCycleCountListResponseDto {
    const dto = new InventoryCycleCountListResponseDto();
    dto.data = items.map((item) => InventoryCycleCountResponseDto.from(item));
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class InventoryCycleCountHistoryResponseDto {
  id!: string;
  cycleCountId!: string;
  workspaceId!: string;
  @ApiPropertyOptional({ enum: InventoryCycleCountStatus, nullable: true })
  fromStatus?: InventoryCycleCountStatus | null;
  toStatus!: InventoryCycleCountStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): InventoryCycleCountHistoryResponseDto {
    const dto = new InventoryCycleCountHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.cycleCountId = raw['cycleCountId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as InventoryCycleCountStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as InventoryCycleCountStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = raw['snapshot'] ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
