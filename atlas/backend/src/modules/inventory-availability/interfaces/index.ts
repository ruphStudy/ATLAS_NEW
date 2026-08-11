export enum AvailabilityEvent {
  AVAILABILITY_RECALCULATED = 'inventory-availability.recalculated',
  LOW_AVAILABILITY = 'inventory-availability.low',
  OUT_OF_STOCK = 'inventory-availability.out_of_stock',
}

export interface IAvailabilitySnapshot {
  inventoryItemId: string;
  sku?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  binId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  allocatedStock: number;
  blockedStock: number;
  damagedStock: number;
  inTransitStock: number;
  incomingStock: number;
  safetyStock: number;
  availableToSell: number;
  availableToPromise: number;
  uom: string;
  calculatedAt: Date;
}

export interface IWarehouseAvailability {
  warehouseId: string;
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  allocatedStock: number;
  blockedStock: number;
  damagedStock: number;
  inTransitStock: number;
  incomingStock: number;
  safetyStock: number;
  availableToSell: number;
  availableToPromise: number;
  uom: string;
}

export interface IAggregatedAvailability {
  inventoryItemId: string;
  sku?: string | null;
  totalPhysicalStock: number;
  totalAvailableStock: number;
  totalReservedStock: number;
  totalAllocatedStock: number;
  totalBlockedStock: number;
  totalDamagedStock: number;
  totalInTransitStock: number;
  totalIncomingStock: number;
  totalSafetyStock: number;
  totalAvailableToSell: number;
  totalAvailableToPromise: number;
  warehouses: IWarehouseAvailability[];
  uom: string;
  calculatedAt: Date;
}

export interface IFutureDateAvailability {
  date: Date;
  expectedAvailableToSell: number;
  expectedAvailableToPromise: number;
  expectedIncoming: number;
  projectedReservations: number;
}

export interface IMarketplaceAvailabilityRule {
  marketplaceAccountId: string;
  safetyStockPercentage?: number;
  bufferQuantity?: number;
  allowOversell: boolean;
  maxOversellQuantity?: number;
  fulfillmentChannels?: string[];
  regions?: string[];
}
