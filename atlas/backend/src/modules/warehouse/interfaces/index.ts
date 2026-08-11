// =============================================================
// Warehouse – Interfaces & Types
// =============================================================

export enum WarehouseType {
  OWN = 'OWN',
  RENTED = 'RENTED',
  THIRD_PARTY = 'THIRD_PARTY',
  MARKETPLACE = 'MARKETPLACE',
  VIRTUAL = 'VIRTUAL',
}

export enum WarehouseStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  CLOSED = 'CLOSED',
  ARCHIVED = 'ARCHIVED',
}

export enum WarehouseEvent {
  CREATED = 'warehouse.created',
  UPDATED = 'warehouse.updated',
  ACTIVATED = 'warehouse.activated',
  DEACTIVATED = 'warehouse.deactivated',
  SUSPENDED = 'warehouse.suspended',
  CLOSED = 'warehouse.closed',
  ARCHIVED = 'warehouse.archived',
  RESTORED = 'warehouse.restored',
  DEFAULT_SET = 'warehouse.default_set',
  DEFAULT_CLEARED = 'warehouse.default_cleared',
}

export enum WarehouseLocationType {
  RECEIVING = 'RECEIVING',
  STORAGE = 'STORAGE',
  PICKING = 'PICKING',
  PACKING = 'PACKING',
  DISPATCH = 'DISPATCH',
  RETURNS = 'RETURNS',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
  VIRTUAL = 'VIRTUAL',
  ZONE = 'ZONE',
  AISLE = 'AISLE',
  RACK = 'RACK',
  SHELF = 'SHELF',
  BIN = 'BIN',
  STAGING = 'STAGING',
  DOCK = 'DOCK',
}

export enum WarehouseLocationStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}

export enum WarehouseLocationEvent {
  CREATED = 'warehouse.location.created',
  UPDATED = 'warehouse.location.updated',
  ACTIVATED = 'warehouse.location.activated',
  DEACTIVATED = 'warehouse.location.deactivated',
  BLOCKED = 'warehouse.location.blocked',
  ARCHIVED = 'warehouse.location.archived',
  RESTORED = 'warehouse.location.restored',
}

export enum BinType {
  STORAGE = 'STORAGE',
  PICKING = 'PICKING',
  RECEIVING = 'RECEIVING',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
  RETURNS = 'RETURNS',
  VIRTUAL = 'VIRTUAL',
}

export enum BinStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}

export enum BinMode {
  FIXED = 'FIXED',
  SHARED = 'SHARED',
  DYNAMIC = 'DYNAMIC',
}

export enum BinEvent {
  CREATED = 'warehouse.bin.created',
  UPDATED = 'warehouse.bin.updated',
  ACTIVATED = 'warehouse.bin.activated',
  DEACTIVATED = 'warehouse.bin.deactivated',
  BLOCKED = 'warehouse.bin.blocked',
  ARCHIVED = 'warehouse.bin.archived',
  RESTORED = 'warehouse.bin.restored',
}

export enum ZoneType {
  RECEIVING = 'RECEIVING',
  STORAGE = 'STORAGE',
  PICKING = 'PICKING',
  PACKING = 'PACKING',
  DISPATCH = 'DISPATCH',
  RETURNS = 'RETURNS',
  QUARANTINE = 'QUARANTINE',
  DAMAGED = 'DAMAGED',
  COLD_STORAGE = 'COLD_STORAGE',
  VIRTUAL = 'VIRTUAL',
}

export enum ZoneStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  BLOCKED = 'BLOCKED',
  ARCHIVED = 'ARCHIVED',
}

export enum ZoneEvent {
  CREATED = 'warehouse.zone.created',
  UPDATED = 'warehouse.zone.updated',
  ACTIVATED = 'warehouse.zone.activated',
  DEACTIVATED = 'warehouse.zone.deactivated',
  BLOCKED = 'warehouse.zone.blocked',
  ARCHIVED = 'warehouse.zone.archived',
  RESTORED = 'warehouse.zone.restored',
}

export enum CapacityEvent {
  WARNING = 'warehouse.capacity.warning',
  EXCEEDED = 'warehouse.capacity.exceeded',
  RESERVED = 'warehouse.capacity.reserved',
  RELEASED = 'warehouse.capacity.released',
  RECALCULATED = 'warehouse.capacity.recalculated',
}

export enum CapacityMeasure {
  VOLUME = 'VOLUME',
  WEIGHT = 'WEIGHT',
  PALLET = 'PALLET',
  CARTON = 'CARTON',
  UNIT = 'UNIT',
}

export enum CapacityLevel {
  WAREHOUSE = 'WAREHOUSE',
  ZONE = 'ZONE',
  LOCATION = 'LOCATION',
  BIN = 'BIN',
}

export enum CapacityStatus {
  AVAILABLE = 'AVAILABLE',
  NEAR_CAPACITY = 'NEAR_CAPACITY',
  CRITICAL = 'CRITICAL',
  EXCEEDED = 'EXCEEDED',
}

export enum StorageCondition {
  AMBIENT = 'AMBIENT',
  REFRIGERATED = 'REFRIGERATED',
  FROZEN = 'FROZEN',
  CONTROLLED_TEMPERATURE = 'CONTROLLED_TEMPERATURE',
  HAZMAT = 'HAZMAT',
  FRAGILE = 'FRAGILE',
  HIGH_VALUE = 'HIGH_VALUE',
}region?: string | null;
  postalCode?: string | null;
  timezone: string;
  currency?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  capacity?: number | null;
  isDefault: boolean;
  isPriority: boolean;
  isFallback: boolean;
  marketplaceAccountId?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseHistory {
  id: string;
  warehouseId: string;
  workspaceId: string;
  fromStatus: WarehouseStatus | null;
  toStatus: WarehouseStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date
  type: WarehouseType;
  status: WarehouseStatus;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  zone?: string | null;
  barcode?: string | null;
  capacity?: number | null;
  occupiedCapacity?: number;
  reservedCapacity?: number;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseLocationHistory {
  id: string;
  locationId: string;
  workspaceId: string;
  fromStatus: WarehouseLocationStatus | null;
  toStatus: WarehouseLocationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date
  isDefault: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseLocation {
  id: string;
  workspaceId: string;
  warehouseId: string;
  parentLocationId?: string | null;
  code: string;
  name?: string | null;
  type: WarehouseLocationType;
  status: WarehouseLocationStatus;
  zone?: string | null;
  barcode?: string | null;
  capacity?: number | null;
  occupiedCapacity?: number;
  reservedCapacity?: number;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseBin {
  id: string;
  workspaceId: string;
  warehouseId: string;
  locationId?: string | null;
  code: string;
  name?: string | null;
  type: BinType;
  status: BinStatus;
  mode: BinMode;
  zone?: string | null;
  barcode?: string | null;
  capacity?: number | null;
  occupiedCapacity: number;
  reservedCapacity: number;
  weightLimit?: number | null;
  dimensionLength?: number | null;
  dimensionWidth?: number | null;
  dimensionHeight?: number | null;
  dimensionUnit?: string | null;
  allowedProductIds: string[];
  allowedCategoryIds: string[];
  allowedStatuses: string[];
  allowBatch: boolean;
  allowSerial: boolean;
  storageConditions: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseBinHistory {
  id: string;
  binId: string;
  workspaceId: string;
  fromStatus: BinStatus | null;
  toStatus: BinStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IWarehouseZone {
  id: string;
  workspaceId: string;
  warehouseId: string;
  code: string;
  name?: string | null;
  type: ZoneType;
  status: ZoneStatus;
  priority: number;
  capacity?: number | null;
  occupiedCapacity: number;
  reservedCapacity: number;
  allowedCategoryIds: string[];
  allowedStatuses: string[];
  allowBatch: boolean;
  allowSerial: boolean;
  storageConditions: string[];
  handlingRequirements: string[];
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IWarehouseZoneHistory {
  id: string;
  zoneId: string;
  workspaceId: string;
  fromStatus: ZoneStatus | null;
  toStatus: ZoneStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface ICapacitySnapshot {
  total: number | null;
  occupied: number;
  reserved: number;
  available: number;
  blocked: number;
  utilizationPercent: number;
  status: CapacityStatus;
}

export interface ICapacityReservation {
  id: string;
  workspaceId: string;
  warehouseId: string;
  level: CapacityLevel;
  entityId: string;
  measure: CapacityMeasure;
  quantity: number;
  referenceType: string;
  referenceId: string;
  expiresAt?: Date | null;
  releasedAt?: Date | null;
  createdAt: Date;
}
