import {
  IsDateString,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaginationDto } from '@common/dto/pagination.dto';

export class CreateInventoryBatchDto {
  @IsString()
  batchNumber!: string;

  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  quantity?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class UpdateInventoryBatchDto {
  @IsOptional()
  @IsDateString()
  manufactureDate?: string;

  @IsOptional()
  @IsDateString()
  expiryDate?: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class InventoryBatchFilterDto extends PaginationDto {
  @IsOptional()
  @IsDateString()
  expiringBefore?: string;
}

export class InventoryBatchResponseDto {
  id!: string;
  inventoryItemId!: string;
  workspaceId!: string;
  batchNumber!: string;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  receivedDate!: Date;
  supplierId?: string | null;
  quantity!: number;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): InventoryBatchResponseDto {
    const dto = new InventoryBatchResponseDto();
    dto.id = raw['id'] as string;
    dto.inventoryItemId = raw['inventoryItemId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.batchNumber = raw['batchNumber'] as string;
    dto.manufactureDate = (raw['manufactureDate'] as Date | null) ?? null;
    dto.expiryDate = (raw['expiryDate'] as Date | null) ?? null;
    dto.receivedDate = raw['receivedDate'] as Date;
    dto.supplierId = (raw['supplierId'] as string | null) ?? null;
    dto.quantity = raw['quantity'] as number;
    dto.metadata = (raw['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class InventoryBatchListResponseDto {
  data!: InventoryBatchResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): InventoryBatchListResponseDto {
    const dto = new InventoryBatchListResponseDto();
    dto.data = items.map(InventoryBatchResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}
