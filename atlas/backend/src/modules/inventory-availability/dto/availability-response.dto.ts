export class AvailabilitySnapshotDto {
  inventoryItemId!: string;
  sku?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  binId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  physicalStock!: number;
  availableStock!: number;
  reservedStock!: number;
  allocatedStock!: number;
  blockedStock!: number;
  damagedStock!: number;
  inTransitStock!: number;
  incomingStock!: number;
  safetyStock!: number;
  availableToSell!: number;
  availableToPromise!: number;
  uom!: string;
  calculatedAt!: Date;
}

export class WarehouseAvailabilityDto {
  warehouseId!: string;
  physicalStock!: number;
  availableStock!: number;
  reservedStock!: number;
  allocatedStock!: number;
  blockedStock!: number;
  damagedStock!: number;
  inTransitStock!: number;
  incomingStock!: number;
  safetyStock!: number;
  availableToSell!: number;
  availableToPromise!: number;
  uom!: string;
}

export class AggregatedAvailabilityDto {
  inventoryItemId!: string;
  sku?: string | null;
  totalPhysicalStock!: number;
  totalAvailableStock!: number;
  totalReservedStock!: number;
  totalAllocatedStock!: number;
  totalBlockedStock!: number;
  totalDamagedStock!: number;
  totalInTransitStock!: number;
  totalIncomingStock!: number;
  totalSafetyStock!: number;
  totalAvailableToSell!: number;
  totalAvailableToPromise!: number;
  warehouses!: WarehouseAvailabilityDto[];
  uom!: string;
  calculatedAt!: Date;
}

export class FutureDateAvailabilityDto {
  date!: Date;
  expectedAvailableToSell!: number;
  expectedAvailableToPromise!: number;
  expectedIncoming!: number;
  projectedReservations!: number;
}

export class BulkAvailabilityResponseDto {
  availabilities!: AvailabilitySnapshotDto[];
  calculatedAt!: Date;
}
