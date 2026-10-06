export enum WarehouseMetricType {
  THROUGHPUT = 'throughput',
  UTILIZATION = 'utilization',
  OCCUPANCY = 'occupancy',
  RECEIVING_VOLUME = 'receiving_volume',
  RECEIVING_ACCURACY = 'receiving_accuracy',
  RECEIVING_CYCLE_TIME = 'receiving_cycle_time',
  PUTAWAY_VOLUME = 'putaway_volume',
  PUTAWAY_ACCURACY = 'putaway_accuracy',
  PUTAWAY_CYCLE_TIME = 'putaway_cycle_time',
  PICKING_VOLUME = 'picking_volume',
  PICKING_ACCURACY = 'picking_accuracy',
  PICKING_CYCLE_TIME = 'picking_cycle_time',
  PACKING_VOLUME = 'packing_volume',
  PACKING_ACCURACY = 'packing_accuracy',
  PACKING_CYCLE_TIME = 'packing_cycle_time',
  DISPATCH_VOLUME = 'dispatch_volume',
  DISPATCH_ACCURACY = 'dispatch_accuracy',
  DISPATCH_CYCLE_TIME = 'dispatch_cycle_time',
  EXCEPTION_RATE = 'exception_rate',
  LABOR_PRODUCTIVITY = 'labor_productivity',
  INVENTORY_DWELL_TIME = 'inventory_dwell_time',
  MOVEMENT_FREQUENCY = 'movement_frequency',
  STORAGE_EFFICIENCY = 'storage_efficiency',
}

export enum WarehouseDimension {
  WAREHOUSE = 'warehouse',
  ZONE = 'zone',
  LOCATION = 'location',
  BIN = 'bin',
  SHIFT = 'shift',
  USER = 'user',
  PRODUCT = 'product',
  CATEGORY = 'category',
  OPERATION_TYPE = 'operation_type',
}

export enum WarehousePeriod {
  HOUR = 'hour',
  SHIFT = 'shift',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  QUARTER = 'quarter',
  YEAR = 'year',
}

export enum WarehousePerformanceCategory {
  EFFICIENT = 'efficient',
  NORMAL = 'normal',
  BOTTLENECK = 'bottleneck',
  IDLE = 'idle',
  CONGESTED = 'congested',
  DELAYED = 'delayed',
  UNDERPERFORMING = 'underperforming',
  HIGH_ACCURACY = 'high_accuracy',
  LOW_ACCURACY = 'low_accuracy',
}

export enum WarehouseComparisonType {
  PREVIOUS_PERIOD = 'previous_period',
  SAME_PERIOD_LAST_YEAR = 'same_period_last_year',
  CROSS_WAREHOUSE = 'cross_warehouse',
  CROSS_ZONE = 'cross_zone',
  TARGET = 'target',
}

export enum WarehouseAnalyticsEventType {
  PERFORMANCE_CALCULATED = 'performance_calculated',
  TREND_UPDATED = 'trend_updated',
  COMPARISON_GENERATED = 'comparison_generated',
  BOTTLENECK_DETECTED = 'bottleneck_detected',
  IDLE_CAPACITY_DETECTED = 'idle_capacity_detected',
  CONGESTION_DETECTED = 'congestion_detected',
  DELAYED_TASK_DETECTED = 'delayed_task_detected',
  UNDERPERFORMING_AREA_DETECTED = 'underperforming_area_detected',
  SLA_BREACH_DETECTED = 'sla_breach_detected',
  BACKLOG_DETECTED = 'backlog_detected',
}

export interface IOperationalMetrics {
  receivingVolume: number;
  receivingAccuracy: number;
  receivingCycleTime: number;
  putawayVolume: number;
  putawayAccuracy: number;
  putawayCycleTime: number;
  pickingVolume: number;
  pickingAccuracy: number;
  pickingCycleTime: number;
  packingVolume: number;
  packingAccuracy: number;
  packingCycleTime: number;
  dispatchVolume: number;
  dispatchAccuracy: number;
  dispatchCycleTime: number;
  exceptionRate: number;
}

export interface ICapacityMetrics {
  totalCapacity: number;
  usedCapacity: number;
  availableCapacity: number;
  capacityUtilization: number;
  occupancyPercent: number;
  zoneCount: number;
  locationCount: number;
  binCount: number;
  utilizableZones: number;
  utilizableLocations: number;
  utilizableBins: number;
}

export interface IInventoryEfficiencyMetrics {
  averageDwellTime: number;
  medianDwellTime: number;
  movementFrequency: number;
  storageEfficiency: number;
  turnoverRate: number;
  fastMovingSkuCount: number;
  slowMovingSkuCount: number;
  deadStockCount: number;
}

export interface ILaborProductivityMetrics {
  totalTasksCompleted: number;
  averageTaskCompletionTime: number;
  tasksPerHour: number;
  activeUserCount: number;
  idleUserCount: number;
  utilizationRate: number;
}

export interface ISlaPerformanceMetrics {
  totalTasks: number;
  onTimeTasks: number;
  delayedTasks: number;
  breachedTasks: number;
  slaComplianceRate: number;
  averageAging: number;
  backlogCount: number;
  backlogPercent: number;
}

export interface IWarehousePerformance {
  workspaceId: string;
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  performanceCategory: WarehousePerformanceCategory;
  operationalMetrics: IOperationalMetrics;
  capacityMetrics: ICapacityMetrics;
  inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
  laborProductivityMetrics: ILaborProductivityMetrics;
  slaPerformanceMetrics: ISlaPerformanceMetrics;
  throughput: number;
  overallScore: number;
  metadata?: Record<string, any>;
}

export interface IWarehouseTrend {
  workspaceId: string;
  warehouseId?: string;
  warehouseName?: string;
  period: WarehousePeriod;
  periodStart: Date;
  periodEnd: Date;
  metricType: WarehouseMetricType;
  value: number;
  previousValue?: number;
  changeAmount?: number;
  changePercent?: number;
  dimension?: WarehouseDimension;
  dimensionValue?: string;
  metadata?: Record<string, any>;
}

export interface IWarehouseBreakdown {
  workspaceId: string;
  dimension: WarehouseDimension;
  dimensionValue: string;
  dimensionLabel?: string;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  operationalMetrics: IOperationalMetrics;
  capacityMetrics: ICapacityMetrics;
  inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
  laborProductivityMetrics: ILaborProductivityMetrics;
  slaPerformanceMetrics: ISlaPerformanceMetrics;
  overallScore: number;
  rank?: number;
  metadata?: Record<string, any>;
}

export interface IWarehouseComparison {
  workspaceId: string;
  comparisonType: WarehouseComparisonType;
  period: WarehousePeriod;
  startDate: Date;
  endDate: Date;
  actualMetrics: {
    operationalMetrics: IOperationalMetrics;
    capacityMetrics: ICapacityMetrics;
    inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
    laborProductivityMetrics: ILaborProductivityMetrics;
    slaPerformanceMetrics: ISlaPerformanceMetrics;
    overallScore: number;
  };
  comparisonMetrics: {
    operationalMetrics: IOperationalMetrics;
    capacityMetrics: ICapacityMetrics;
    inventoryEfficiencyMetrics: IInventoryEfficiencyMetrics;
    laborProductivityMetrics: ILaborProductivityMetrics;
    slaPerformanceMetrics: ISlaPerformanceMetrics;
    overallScore: number;
  };
  variance: {
    throughputVariance: number;
    throughputVariancePercent: number;
    utilizationVariancePoints: number;
    accuracyVariancePoints: number;
    cycleTimeVariance: number;
    slaComplianceVariancePoints: number;
    overallScorePoints: number;
  };
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  metadata?: Record<string, any>;
}

export interface IWarehouseIssueAlert {
  workspaceId: string;
  alertType: WarehousePerformanceCategory;
  severity: 'low' | 'medium' | 'high' | 'critical';
  warehouseId?: string;
  warehouseName?: string;
  zoneId?: string;
  zoneName?: string;
  locationId?: string;
  binId?: string;
  operationType?: string;
  userId?: string;
  productId?: string;
  reason: string;
  details: Record<string, any>;
  detectedAt: Date;
  metadata?: Record<string, any>;
}

export interface IWarehouseAnalyticsFilters {
  workspaceId: string;
  startDate: Date;
  endDate: Date;
  period?: WarehousePeriod;
  warehouseIds?: string[];
  zoneIds?: string[];
  locationIds?: string[];
  binIds?: string[];
  shiftIds?: string[];
  userIds?: string[];
  productIds?: string[];
  categories?: string[];
  operationTypes?: string[];
  performanceCategories?: WarehousePerformanceCategory[];
  minThroughput?: number;
  maxThroughput?: number;
  minUtilization?: number;
  maxUtilization?: number;
  minOverallScore?: number;
}

export interface IWarehouseAnalyticsEvent {
  event: WarehouseAnalyticsEventType;
  workspaceId: string;
  warehouseId?: string;
  zoneId?: string;
  locationId?: string;
  binId?: string;
  operationType?: string;
  userId?: string;
  productId?: string;
  performanceCategory?: WarehousePerformanceCategory;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, any>;
}
