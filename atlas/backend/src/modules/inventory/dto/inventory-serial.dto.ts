import { IsDateString, IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';
import { InventoryStockStatus } from '../interfaces';

export class CreateInventorySerialDto {
  @IsString()
  serialNumber!: string;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;

  @IsOptional()
  @IsString()
  locationId?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateInventorySerialStatusDto {
  @IsEnum(InventoryStockStatus)
  status!: InventoryStockStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class InventorySerialFilterDto extends PaginationDto {
  @IsOptional()
  @IsEnum(InventoryStockStatus)
  status?: InventoryStockStatus;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  warehouseId?: string;
}

export class InventorySerialResponseDto {
  id!: string;
  inventoryItemId!: string;
  workspaceId!: string;
  batchId?: string | null;
  serialNumber!: string;
  status!: InventoryStockStatus;
  warehouseId?: string | null;
  locationId?: string | null;
  expiryDate?: Date | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventorySerialResponseDto {
    const dto = new InventorySerialResponseDto();
    dto.id = raw['id'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.batchId = (raw['batchId'] as string | null) ?? null;
    dto.serialNumber = raw['serialNumber'] as string;
    dto.status = raw['status'] as InventoryStockStatus;
    dto.warehouseId = (raw['warehouseId'] as string | null) ?? null;
    dto.locationId = (raw['locationId'] as string | null) ?? null;
    dto.expiryDate = (raw['expiryDate'] as Date | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventorySerialListResponseDto {
  data!: InventorySerialResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventorySerialListResponseDto {
    const dto = new InventorySerialListResponseDto();
    dto.data = items.map(InventorySerialResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
