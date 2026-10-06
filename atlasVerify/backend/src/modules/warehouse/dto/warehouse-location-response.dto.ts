import { WarehouseLocationStatus, WarehouseLocationType } from '../interfaces';

export class WarehouseLocationResponseDto {
  id!: string;
  workspaceId!: string;
  warehouseId!: string;
  parentLocationId?: string | null;
  code!: string;
  name?: string | null;
  type!: WarehouseLocationType;
  status!: WarehouseLocationStatus;
  zone?: string | null;
  barcode?: string | null;
  capacity?: number | null;
  occupiedCapacity!: number;
  reservedCapacity!: number;
  availableCapacity!: number;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(raw: Record<string, unknown>): WarehouseLocationResponseDto {
    const dto = new WarehouseLocationResponseDto();
    dto.id = raw['id'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.warehouseId = raw['warehouseId'] as string;
    dto.parentLocationId = (raw['parentLocationId'] as string | null) ?? null;
    dto.code = raw['code'] as string;
    dto.name = (raw['name'] as string | null) ?? null;
    dto.type = raw['type'] as WarehouseLocationType;
    dto.status = raw['status'] as WarehouseLocationStatus;
    dto.zone = (raw['zone'] as string | null) ?? null;
    dto.barcode = (raw['barcode'] as string | null) ?? null;
    dto.capacity = (raw['capacity'] as number | null) ?? null;
    dto.occupiedCapacity = (raw['occupiedCapacity'] as number) ?? 0;
    dto.reservedCapacity = (raw['reservedCapacity'] as number) ?? 0;
    dto.availableCapacity = (dto.capacity ?? 0) - dto.occupiedCapacity - dto.reservedCapacity;
    dto.dimensionLength = (raw['dimensionLength'] as number | null) ?? null;
    dto.dimensionWidth = (raw['dimensionWidth'] as number | null) ?? null;
    dto.dimensionHeight = (raw['dimensionHeight'] as number | null) ?? null;
    dto.dimensionUnit = (raw['dimensionUnit'] as string | null) ?? null;
    dto.metadata = (raw['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = raw['createdAt'] as Date;
    dto.updatedAt = raw['updatedAt'] as Date;
    return dto;
  }
}

export class WarehouseLocationListResponseDto {
  data!: WarehouseLocationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): WarehouseLocationListResponseDto {
    const dto = new WarehouseLocationListResponseDto();
    dto.data = items.map(WarehouseLocationResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class WarehouseLocationHistoryResponseDto {
  id!: string;
  locationId!: string;
  workspaceId!: string;
  fromStatus?: WarehouseLocationStatus | null;
  toStatus!: WarehouseLocationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: Record<string, unknown> | null;
  createdAt!: Date;

  static from(raw: Record<string, unknown>): WarehouseLocationHistoryResponseDto {
    const dto = new WarehouseLocationHistoryResponseDto();
    dto.id = raw['id'] as string;
    dto.locationId = raw['locationId'] as string;
    dto.workspaceId = raw['workspaceId'] as string;
    dto.fromStatus = (raw['fromStatus'] as WarehouseLocationStatus | null) ?? null;
    dto.toStatus = raw['toStatus'] as WarehouseLocationStatus;
    dto.reason = (raw['reason'] as string | null) ?? null;
    dto.changedBy = (raw['changedBy'] as string | null) ?? null;
    dto.snapshot = (raw['snapshot'] as Record<string, unknown> | null) ?? null;
    dto.createdAt = raw['createdAt'] as Date;
    return dto;
  }
}
