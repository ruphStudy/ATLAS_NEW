import { BinType, BinStatus, BinMode } from '../interfaces';

export class WarehouseBinResponseDto {
  id!: string;
  workspaceId!: string;
  warehouseId!: string;
  locationId!: string | null;
  code!: string;
  name!: string | null;
  type!: BinType;
  status!: BinStatus;
  mode!: BinMode;
  zone!: string | null;
  barcode!: string | null;
  capacity!: number | null;
  occupiedCapacity!: number;
  reservedCapacity!: number;
  availableCapacity!: number;
  weightLimit!: number | null;
  dimensionLength!: number | null;
  dimensionWidth!: number | null;
  dimensionHeight!: number | null;
  dimensionUnit!: string | null;
  allowedProductIds!: string[];
  allowedCategoryIds!: string[];
  allowedStatuses!: string[];
  allowBatch!: boolean;
  allowSerial!: boolean;
  storageConditions!: string[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): WarehouseBinResponseDto {
    const dto = new WarehouseBinResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.warehouseId = record['warehouseId'] as string;
    dto.locationId = (record['locationId'] as string) ?? null;
    dto.code = record['code'] as string;
    dto.name = (record['name'] as string) ?? null;
    dto.type = record['type'] as BinType;
    dto.status = record['status'] as BinStatus;
    dto.mode = record['mode'] as BinMode;
    dto.zone = (record['zone'] as string) ?? null;
    dto.barcode = (record['barcode'] as string) ?? null;
    dto.capacity = (record['capacity'] as number) ?? null;
    dto.occupiedCapacity = (record['occupiedCapacity'] as number) ?? 0;
    dto.reservedCapacity = (record['reservedCapacity'] as number) ?? 0;
    dto.availableCapacity = (dto.capacity ?? 0) - dto.occupiedCapacity - dto.reservedCapacity;
    dto.weightLimit = (record['weightLimit'] as number) ?? null;
    dto.dimensionLength = (record['dimensionLength'] as number) ?? null;
    dto.dimensionWidth = (record['dimensionWidth'] as number) ?? null;
    dto.dimensionHeight = (record['dimensionHeight'] as number) ?? null;
    dto.dimensionUnit = (record['dimensionUnit'] as string) ?? null;
    dto.allowedProductIds = (record['allowedProductIds'] as string[]) ?? [];
    dto.allowedCategoryIds = (record['allowedCategoryIds'] as string[]) ?? [];
    dto.allowedStatuses = (record['allowedStatuses'] as string[]) ?? [];
    dto.allowBatch = (record['allowBatch'] as boolean) ?? true;
    dto.allowSerial = (record['allowSerial'] as boolean) ?? true;
    dto.storageConditions = (record['storageConditions'] as string[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class WarehouseBinListResponseDto {
  items!: WarehouseBinResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): WarehouseBinListResponseDto {
    const dto = new WarehouseBinListResponseDto();
    dto.items = items.map(WarehouseBinResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class WarehouseBinHistoryResponseDto {
  id!: string;
  binId!: string;
  workspaceId!: string;
  fromStatus!: BinStatus | null;
  toStatus!: BinStatus;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;

  static from(record: Record<string, unknown>): WarehouseBinHistoryResponseDto {
    const dto = new WarehouseBinHistoryResponseDto();
    dto.id = record['id'] as string;
    dto.binId = record['binId'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.fromStatus = (record['fromStatus'] as BinStatus) ?? null;
    dto.toStatus = record['toStatus'] as BinStatus;
    dto.reason = (record['reason'] as string) ?? null;
    dto.changedBy = (record['changedBy'] as string) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    return dto;
  }
}
