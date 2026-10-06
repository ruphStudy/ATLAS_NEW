import { ApiPropertyOptional } from '@nestjs/swagger';
import { WarehouseStatus, WarehouseType } from '../interfaces';

export class WarehouseResponseDto {
  id!: string;
  workspaceId!: string;
  code!: string;
  name!: string;
  type!: WarehouseType;
  status!: WarehouseStatus;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  region?: string | null;
  postalCode?: string | null;
  timezone!: string;
  currency?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  capacity?: number | null;
  isDefault!: boolean;
  isPriority!: boolean;
  isFallback!: boolean;
  marketplaceAccountId?: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): WarehouseResponseDto {
    const dto = new WarehouseResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.code = raw['code'] as string;
    dto.name = raw['name'] as string;
    dto.type = raw['type'] as WarehouseType;
    dto.status = raw['status'] as WarehouseStatus;
    dto.addressLine1 = (raw['addressLine1'] as string | null) ?? null;
    dto.addressLine2 = (raw['addressLine2'] as string | null) ?? null;
    dto.city = (raw['city'] as string | null) ?? null;
    dto.state = (raw['state'] as string | null) ?? null;
    dto.country = (raw['country'] as string | null) ?? null;
    dto.region = (raw['region'] as string | null) ?? null;
    dto.postalCode = (raw['postalCode'] as string | null) ?? null;
    dto.timezone = raw['timezone'] as string;
    dto.currency = (raw['currency'] as string | null) ?? null;
    dto.contactName = (raw['contactName'] as string | null) ?? null;
    dto.contactEmail = (raw['contactEmail'] as string | null) ?? null;
    dto.contactPhone = (raw['contactPhone'] as string | null) ?? null;
    dto.capacity = (raw['capacity'] as number | null) ?? null;
    dto.isDefault = raw['isDefault'] as boolean;
    dto.isPriority = raw['isPriority'] as boolean;
    dto.isFallback = raw['isFallback'] as boolean;
    dto.marketplaceAccountId = (raw['marketplaceAccountId'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class WarehouseListResponseDto {
  data!: WarehouseResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): WarehouseListResponseDto {
    const dto = new WarehouseListResponseDto();
    dto.data = items.map(WarehouseResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class WarehouseHistoryResponseDto {
  id!: string;
  warehouseId!: string;
  workspaceId!: string;
  @ApiPropertyOptional({ enum: WarehouseStatus, nullable: true })
  fromStatus?: WarehouseStatus | null;
  toStatus!: WarehouseStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: Record<string, unknown> | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): WarehouseHistoryResponseDto {
    const dto = new WarehouseHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as WarehouseStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as WarehouseStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = (raw['snapshot'] as Record<string, unknown> | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
