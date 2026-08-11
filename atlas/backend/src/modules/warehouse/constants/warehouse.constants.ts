import { WarehouseStatus, WarehouseLocationStatus, BinStatus, ZoneStatus } from '../interfaces';

export const WAREHOUSE_CONSTANTS = {
  DEFAULT_TIMEZONE: 'UTC',
  DEFAULT_CURRENCY: 'USD',

  ALLOWED_STATUS_TRANSITIONS: {
    [WarehouseStatus.ACTIVE]: [
      WarehouseStatus.INACTIVE,
      WarehouseStatus.SUSPENDED,
      WarehouseStatus.CLOSED,
    ],
    [WarehouseStatus.INACTIVE]: [
      WarehouseStatus.ACTIVE,
      WarehouseStatus.SUSPENDED,
      WarehouseStatus.CLOSED,
      WarehouseStatus.ARCHIVED,
    ],
    [WarehouseStatus.SUSPENDED]: [
      WarehouseStatus.ACTIVE,
      WarehouseStatus.INACTIVE,
      WarehouseStatus.CLOSED,
    ],
    [WarehouseStatus.CLOSED]: [WarehouseStatus.ARCHIVED],
    [WarehouseStatus.ARCHIVED]: [WarehouseStatus.INACTIVE],
  } as Record<WarehouseStatus, WarehouseStatus[]>,

  ALLOWED_LOCATION_STATUS_TRANSITIONS: {
    [WarehouseLocationStatus.ACTIVE]: [
      WarehouseLocationStatus.INACTIVE,
      WarehouseLocationStatus.BLOCKED,
    ],
    [WarehouseLocationStatus.INACTIVE]: [
      WarehouseLocationStatus.ACTIVE,
      WarehouseLocationStatus.BLOCKED,
      WarehouseLocationStatus.ARCHIVED,
    ],
    [WarehouseLocationStatus.BLOCKED]: [
      WarehouseLocationStatus.ACTIVE,
      WarehouseLocationStatus.INACTIVE,
    ],
    [WarehouseLocationStatus.ARCHIVED]: [WarehouseLocationStatus.INACTIVE],
  } as Record<WarehouseLocationStatus, WarehouseLocationStatus[]>,

  ALLOWED_BIN_STATUS_TRANSITIONS: {
    [BinStatus.ACTIVE]: [BinStatus.INACTIVE, BinStatus.BLOCKED],
    [BinStatus.INACTIVE]: [BinStatus.ACTIVE, BinStatus.BLOCKED, BinStatus.ARCHIVED],
    [BinStatus.BLOCKED]: [BinStatus.ACTIVE, BinStatus.INACTIVE],
    [BinStatus.ARCHIVED]: [BinStatus.INACTIVE],
  } as Record<BinStatus, BinStatus[]>,

  ALLOWED_ZONE_STATUS_TRANSITIONS: {
    [ZoneStatus.ACTIVE]: [ZoneStatus.INACTIVE, ZoneStatus.BLOCKED],
    [ZoneStatus.INACTIVE]: [ZoneStatus.ACTIVE, ZoneStatus.BLOCKED, ZoneStatus.ARCHIVED],
    [ZoneStatus.BLOCKED]: [ZoneStatus.ACTIVE, ZoneStatus.INACTIVE],
    [ZoneStatus.ARCHIVED]: [ZoneStatus.INACTIVE],
  } as Record<ZoneStatus, ZoneStatus[]>,
} as const;

export const WAREHOUSE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  code: 'code',
  status: 'status',
  type: 'type',
};

export const WAREHOUSE_LOCATION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  code: 'code',
  name: 'name',
  status: 'status',
  type: 'type',
};
