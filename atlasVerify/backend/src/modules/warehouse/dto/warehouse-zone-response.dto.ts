import { ZoneType, ZoneStatus } from '../interfaces';

export class WarehouseZoneResponseDto {
  id!: string;
  workspaceId!: string;
  warehouseId!: string;
  code!: string;
  name!: string | null;
  type!: ZoneType;
  status!: ZoneStatus;
  priority!: number;
  capacity!: number | null;
  occupiedCapacity!: number;
  reservedCapacity!: number;
  availableCapacity!: number;
  allowedCategoryIds!: string[];
  allowedStatuses!: string[];
  allowBatch!: boolean;
  allowSerial!: boolean;
  storageConditions!: string[];
  handlingRequirements!: string[];
  metadata!: Record<string, unknown>;
  createdAt!: Date;
  updatedAt!: Date;

  static from(record: Record<string, unknown>): WarehouseZoneResponseDto {
    const dto = new WarehouseZoneResponseDto();
    dto.id = record['id'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.warehouseId = record['warehouseId'] as string;
    dto.code = record['code'] as string;
    dto.name = (record['name'] as string) ?? null;
    dto.type = record['type'] as ZoneType;
    dto.status = record['status'] as ZoneStatus;
    dto.priority = (record['priority'] as number) ?? 0;
    dto.capacity = (record['capacity'] as number) ?? null;
    dto.occupiedCapacity = (record['occupiedCapacity'] as number) ?? 0;
    dto.reservedCapacity = (record['reservedCapacity'] as number) ?? 0;
    dto.availableCapacity = (dto.capacity ?? 0) - dto.occupiedCapacity - dto.reservedCapacity;
    dto.allowedCategoryIds = (record['allowedCategoryIds'] as string[]) ?? [];
    dto.allowedStatuses = (record['allowedStatuses'] as string[]) ?? [];
    dto.allowBatch = (record['allowBatch'] as boolean) ?? true;
    dto.allowSerial = (record['allowSerial'] as boolean) ?? true;
    dto.storageConditions = (record['storageConditions'] as string[]) ?? [];
    dto.handlingRequirements = (record['handlingRequirements'] as string[]) ?? [];
    dto.metadata = (record['metadata'] as Record<string, unknown>) ?? {};
    dto.createdAt = record['createdAt'] as Date;
    dto.updatedAt = record['updatedAt'] as Date;
    return dto;
  }
}

export class WarehouseZoneListResponseDto {
  items!: WarehouseZoneResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;

  static from(
    items: Record<string, unknown>[],
    total: number,
    page: number,
    limit: number,
  ): WarehouseZoneListResponseDto {
    const dto = new WarehouseZoneListResponseDto();
    dto.items = items.map(WarehouseZoneResponseDto.from);
    dto.total = total;
    dto.page = page;
    dto.limit = limit;
    dto.totalPages = Math.ceil(total / limit);
    return dto;
  }
}

export class WarehouseZoneHistoryResponseDto {
  id!: string;
  zoneId!: string;
  workspaceId!: string;
  fromStatus!: ZoneStatus | null;
  toStatus!: ZoneStatus;
  reason!: string | null;
  changedBy!: string | null;
  createdAt!: Date;

  static from(record: Record<string, unknown>): WarehouseZoneHistoryResponseDto {
    const dto = new WarehouseZoneHistoryResponseDto();
    dto.id = record['id'] as string;
    dto.zoneId = record['zoneId'] as string;
    dto.workspaceId = record['workspaceId'] as string;
    dto.fromStatus = (record['fromStatus'] as ZoneStatus) ?? null;
    dto.toStatus = record['toStatus'] as ZoneStatus;
    dto.reason = (record['reason'] as string) ?? null;
    dto.changedBy = (record['changedBy'] as string) ?? null;
    dto.createdAt = record['createdAt'] as Date;
    return dto;
  }
}
