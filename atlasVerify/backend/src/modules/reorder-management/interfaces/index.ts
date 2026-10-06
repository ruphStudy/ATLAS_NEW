export enum ReorderStrategy {
  FIXED_QUANTITY = 'FIXED_QUANTITY',
  MIN_MAX = 'MIN_MAX',
  DAYS_OF_COVER = 'DAYS_OF_COVER',
  DEMAND_BASED = 'DEMAND_BASED',
}

export enum StockLevelStatus {
  NORMAL = 'NORMAL',
  LOW = 'LOW',
  CRITICAL = 'CRITICAL',
  EXCESS = 'EXCESS',
  OUT_OF_STOCK = 'OUT_OF_STOCK',
}

export enum ReorderRecommendationStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  SNOOZED = 'SNOOZED',
  RESOLVED = 'RESOLVED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ReorderEvent {
  LOW_STOCK_DETECTED = 'reorder.low_stock_detected',
  CRITICAL_STOCK_DETECTED = 'reorder.critical_stock_detected',
  OUT_OF_STOCK_DETECTED = 'reorder.out_of_stock_detected',
  EXCESS_STOCK_DETECTED = 'reorder.excess_stock_detected',
  RECOMMENDATION_CREATED = 'reorder.recommendation_created',
  RECOMMENDATION_APPROVED = 'reorder.recommendation_approved',
  RECOMMENDATION_REJECTED = 'reorder.recommendation_rejected',
  RECOMMENDATION_SNOOZED = 'reorder.recommendation_snoozed',
  RECOMMENDATION_RESOLVED = 'reorder.recommendation_resolved',
  RECOMMENDATION_EXPIRED = 'reorder.recommendation_expired',
}

export interface IReorderConfiguration {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId?: string | null;
  marketplaceAccountId?: string | null;
  reorderPoint?: number | null;
  safetyStock?: number | null;
  minimumStock?: number | null;
  maximumStock?: number | null;
  targetDaysOfCover?: number | null;
  reorderStrategy: ReorderStrategy;
  fixedReorderQuantity?: number | null;
  leadTimeDays?: number | null;
  supplierId?: string | null;
  preferredSupplierId?: string | null;
  enabled: boolean;
  priority: number;
  region?: string | null;
  channel?: string | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IReorderRecommendation {
  id: string;
  workspaceId: string;
  recommendationNumber: string;
  recommendationSequence: number;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId?: string | null;
  marketplaceAccountId?: string | null;
  configurationId?: string | null;
  status: ReorderRecommendationStatus;
  stockLevelStatus: StockLevelStatus;
  currentStock: number;
  availableStock: number;
  reservedStock: number;
  allocatedStock: number;
  incomingStock: number;
  inTransitStock: number;
  reorderPoint?: number | null;
  safetyStock?: number | null;
  minimumStock?: number | null;
  maximumStock?: number | null;
  recommendedQuantity: number;
  calculatedQuantity: number;
  overrideQuantity?: number | null;
  demandRate?: number | null;
  leadTimeDays?: number | null;
  targetDaysOfCover?: number | null;
  preferredSupplierId?: string | null;
  estimatedCost?: number | null;
  estimatedDeliveryDate?: Date | null;
  score?: number | null;
  urgency?: string | null;
  reason?: string | null;
  calculationInputs?: Record<string, unknown> | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  snoozedUntil?: Date | null;
  snoozedBy?: string | null;
  snoozeReason?: string | null;
  resolvedAt?: Date | null;
  resolvedBy?: string | null;
  resolutionNotes?: string | null;
  procurementDraftId?: string | null;
  purchaseOrderId?: string | null;
  expiresAt?: Date | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}
