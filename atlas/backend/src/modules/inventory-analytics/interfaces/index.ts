export enum InventoryAnalyticsPeriod {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
}

export enum InventoryAnalyticsEvent {
  ANALYTICS_REFRESHED = 'inventory-analytics.refreshed',
  CACHE_INVALIDATED = 'inventory-analytics.cache_invalidated',
  SNAPSHOT_CREATED = 'inventory-analytics.snapshot_created',
}

export interface IInventoryKPIs {
  physicalStock: number;
  availableStock: number;
  reservedStock: number;
  allocatedStock: number;
  blockedStock: number;
  damagedStock: number;
  inTransitStock: number;
  incomingStock: number;
  stockValue?: number;
  averageCost?: number;
  turnoverRate?: number;
  daysOfCover?: number;
}

export interface IStockLevelMetrics {
  lowStockCount: number;
  outOfStockCount: number;
  excessStockCount: number;
  deadStockCount: number;
  normalStockCount: number;
  criticalStockCount: number;
}

export interface IInventoryMovementMetrics {
  receivedQuantity: number;
  dispatchedQuantity: number;
  adjustmentQuantity: number;
  transferInQuantity: number;
  transferOutQuantity: number;
  netMovement: number;
}

export interface IWarehousePerformance {
  warehouseId: string;
  warehouseName?: string;
  receivingCount: number;
  putawayCount: number;
  pickingCount: number;
  packingCount: number;
  dispatchCount: number;
  transferCount: number;
  adjustmentCount: number;
  cycleCountCount: number;
  averageReceivingTime?: number;
  averagePutawayTime?: number;
  averagePickingTime?: number;
  averagePackingTime?: number;
  capacityUtilization?: number;
  occupancyPercentage?: number;
}

export interface IInventoryValueMetrics {
  totalStockValue: number;
  availableStockValue: number;
  reservedStockValue: number;
  blockedStockValue: number;
  damagedStockValue: number;
  carryingCost?: number;
  totalSKUs: number;
  totalProducts: number;
}

export interface IInventoryAgingMetrics {
  lessThan30Days: number;
  between30And60Days: number;
  between60And90Days: number;
  moreThan90Days: number;
  averageAgingDays: number;
}

export interface IDashboardSummary {
  kpis: IInventoryKPIs;
  stockLevels: IStockLevelMetrics;
  movements: IInventoryMovementMetrics;
  value: IInventoryValueMetrics;
  aging: IInventoryAgingMetrics;
  warehouses: IWarehousePerformance[];
  lastUpdated: Date;
}

export interface ITrendDataPoint {
  date: Date;
  value: number;
  label?: string;
}

export interface IInventoryTrend {
  metric: string;
  period: InventoryAnalyticsPeriod;
  dataPoints: ITrendDataPoint[];
}

export interface IProductAnalytics {
  inventoryItemId: string;
  sku?: string;
  productName?: string;
  physicalStock: number;
  availableStock: number;
  stockValue?: number;
  turnoverRate?: number;
  daysOfCover?: number;
  lastReceived?: Date;
  lastDispatched?: Date;
  totalReceived: number;
  totalDispatched: number;
}

export interface IWarehouseBreakdown {
  warehouseId: string;
  warehouseName?: string;
  physicalStock: number;
  availableStock: number;
  stockValue?: number;
  skuCount: number;
  capacityUtilization?: number;
}
