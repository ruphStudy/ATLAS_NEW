export class ReorderConfigurationResponseDto {
  id!: string;
  workspaceId!: string;
  inventoryItemId!: string;
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
  reorderStrategy!: string;
  fixedReorderQuantity?: number | null;
  leadTimeDays?: number | null;
  supplierId?: string | null;
  preferredSupplierId?: string | null;
  enabled!: boolean;
  priority!: number;
  region?: string | null;
  channel?: string | null;
  notes?: string | null;
  metadata!: Record<string, unknown>;
  createdBy?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class ReorderRecommendationResponseDto {
  id!: string;
  workspaceId!: string;
  recommendationNumber!: string;
  inventoryItemId!: string;
  sku?: string | null;
  warehouseId?: string | null;
  status!: string;
  stockLevelStatus!: string;
  currentStock!: number;
  availableStock!: number;
  reservedStock!: number;
  allocatedStock!: number;
  incomingStock!: number;
  reorderPoint?: number | null;
  safetyStock?: number | null;
  recommendedQuantity!: number;
  overrideQuantity?: number | null;
  demandRate?: number | null;
  leadTimeDays?: number | null;
  preferredSupplierId?: string | null;
  estimatedCost?: number | null;
  estimatedDeliveryDate?: Date | null;
  score?: number | null;
  urgency?: string | null;
  reason?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  rejectedBy?: string | null;
  rejectedAt?: Date | null;
  rejectionReason?: string | null;
  snoozedUntil?: Date | null;
  resolvedAt?: Date | null;
  procurementDraftId?: string | null;
  purchaseOrderId?: string | null;
  expiresAt?: Date | null;
  notes?: string | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export class PaginatedReorderConfigurationResponseDto {
  data!: ReorderConfigurationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}

export class PaginatedReorderRecommendationResponseDto {
  data!: ReorderRecommendationResponseDto[];
  total!: number;
  page!: number;
  limit!: number;
  totalPages!: number;
}
