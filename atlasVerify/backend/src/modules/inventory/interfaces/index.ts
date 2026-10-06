// =============================================================
// Inventory Foundation – Interfaces & Types
// =============================================================

export enum InventoryItemStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  DISCONTINUED = 'DISCONTINUED',
  ARCHIVED = 'ARCHIVED',
}

export enum InventoryTrackingType {
  NONE = 'NONE',
  BATCH = 'BATCH',
  SERIAL = 'SERIAL',
}

// Inventory status values (scope-mandated): Available, Reserved, Damaged, Lost, In Transit, Blocked
export enum InventoryStockStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  DAMAGED = 'DAMAGED',
  LOST = 'LOST',
  IN_TRANSIT = 'IN_TRANSIT',
  BLOCKED = 'BLOCKED',
}

export enum InventoryOwnershipType {
  WORKSPACE = 'WORKSPACE',
  CONSIGNMENT = 'CONSIGNMENT',
  THIRD_PARTY_SELLER = 'THIRD_PARTY_SELLER',
  SUPPLIER = 'SUPPLIER',
  CUSTOMER = 'CUSTOMER',
}

export enum InventoryTransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  DISPATCH = 'DISPATCH',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  RESERVE = 'RESERVE',
  RELEASE = 'RELEASE',
  STATUS_CHANGE = 'STATUS_CHANGE',
  BATCH_CREATED = 'BATCH_CREATED',
  SERIAL_STATUS_CHANGE = 'SERIAL_STATUS_CHANGE',
  EXPIRED = 'EXPIRED',
  REVERSAL = 'REVERSAL',
}

export enum InventoryTransactionStatus {
  POSTED = 'POSTED',
  REVERSED = 'REVERSED',
}

export enum InventoryReservationStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryReservationLineStatus {
  PLANNED = 'PLANNED',
  ACTIVE = 'ACTIVE',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryReservationSource {
  ORDER = 'ORDER',
  TRANSFER = 'TRANSFER',
  PICKING = 'PICKING',
  MARKETPLACE = 'MARKETPLACE',
  MANUAL = 'MANUAL',
}

export enum InventoryAllocationSource {
  ORDER = 'ORDER',
  TRANSFER = 'TRANSFER',
  MARKETPLACE = 'MARKETPLACE',
  REPLENISHMENT = 'REPLENISHMENT',
  MANUAL = 'MANUAL',
}

export enum InventoryAllocationStrategy {
  FIFO = 'FIFO',
  FEFO = 'FEFO',
  LIFO = 'LIFO',
  NEAREST_WAREHOUSE = 'NEAREST_WAREHOUSE',
  LOWEST_FULFILLMENT_COST = 'LOWEST_FULFILLMENT_COST',
  HIGHEST_AVAILABLE_STOCK = 'HIGHEST_AVAILABLE_STOCK',
  PRIORITY_WAREHOUSE = 'PRIORITY_WAREHOUSE',
}

export enum InventoryAllocationStatus {
  PENDING = 'PENDING',
  ALLOCATED = 'ALLOCATED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  SHORTAGE = 'SHORTAGE',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryAllocationLineStatus {
  ALLOCATED = 'ALLOCATED',
  RELEASED = 'RELEASED',
  CANCELLED = 'CANCELLED',
}

// Adjustment types (scope-mandated): quantity increase, decrease, damage, loss,
// expiry, count variance and status correction.
export enum InventoryAdjustmentType {
  INCREASE = 'INCREASE',
  DECREASE = 'DECREASE',
  DAMAGE = 'DAMAGE',
  LOSS = 'LOSS',
  EXPIRY = 'EXPIRY',
  COUNT_VARIANCE = 'COUNT_VARIANCE',
  STATUS_CORRECTION = 'STATUS_CORRECTION',
}

export enum InventoryAdjustmentStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum InventoryReconciliationSourceType {
  WAREHOUSE = 'WAREHOUSE',
  MARKETPLACE = 'MARKETPLACE',
  SUPPLIER = 'SUPPLIER',
  PHYSICAL_COUNT = 'PHYSICAL_COUNT',
}

export enum InventoryReconciliationTrigger {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  BULK = 'BULK',
  SOURCE_SPECIFIC = 'SOURCE_SPECIFIC',
}

export enum InventoryReconciliationStatus {
  PENDING = 'PENDING',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryReconciliationVarianceType {
  MATCHED = 'MATCHED',
  MISSING = 'MISSING',
  EXCESS = 'EXCESS',
  DUPLICATE = 'DUPLICATE',
  STALE = 'STALE',
}

export enum InventoryReconciliationClassification {
  MATCHED = 'MATCHED',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  UNRESOLVED = 'UNRESOLVED',
}

export enum InventoryReconciliationFindingStatus {
  OPEN = 'OPEN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  IGNORED = 'IGNORED',
  RESOLVED = 'RESOLVED',
}

// Cycle count types (scope-mandated): full, partial, blind, spot and ABC-based.
export enum InventoryCycleCountType {
  FULL = 'FULL',
  PARTIAL = 'PARTIAL',
  BLIND = 'BLIND',
  SPOT = 'SPOT',
  ABC = 'ABC',
}

export enum InventoryCycleCountStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryCycleCountLineStatus {
  PENDING = 'PENDING',
  COUNTED = 'COUNTED',
  RECOUNT_REQUIRED = 'RECOUNT_REQUIRED',
  VERIFIED = 'VERIFIED',
}

// Movement lifecycle (scope-mandated): create, approve, execute, cancel, reverse.
export enum InventoryMovementStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  EXECUTED = 'EXECUTED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

// Transfer lifecycle: create, approve, dispatch, receive, partially receive, cancel, reverse.
export enum InventoryTransferStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  DISPATCHED = 'DISPATCHED',
  IN_TRANSIT = 'IN_TRANSIT',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
  REVERSED = 'REVERSED',
}

export enum InventoryTransferLineStatus {
  PENDING = 'PENDING',
  RESERVED = 'RESERVED',
  DISPATCHED = 'DISPATCHED',
  RECEIVED = 'RECEIVED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryEvent {
  ITEM_CREATED = 'inventory.item.created',
  ITEM_UPDATED = 'inventory.item.updated',
  ITEM_ACTIVATED = 'inventory.item.activated',
  ITEM_DISCONTINUED = 'inventory.item.discontinued',
  ITEM_ARCHIVED = 'inventory.item.archived',
  STOCK_RECEIVED = 'inventory.stock.received',
  STOCK_ISSUED = 'inventory.stock.issued',
  STOCK_TRANSFERRED = 'inventory.stock.transferred',
  STOCK_ADJUSTED = 'inventory.stock.adjusted',
  STOCK_RESERVED = 'inventory.stock.reserved',
  STOCK_RELEASED = 'inventory.stock.released',
  STOCK_STATUS_CHANGED = 'inventory.stock.status_changed',
  STOCK_MOVED = 'inventory.stock.moved',
  STOCK_DISPATCHED = 'inventory.stock.dispatched',
  STOCK_RETURNED = 'inventory.stock.returned',
  BATCH_CREATED = 'inventory.batch.created',
  BATCH_EXPIRED = 'inventory.batch.expired',
  SERIAL_CREATED = 'inventory.serial.created',
  SERIAL_STATUS_CHANGED = 'inventory.serial.status_changed',
  TRANSACTION_POSTED = 'inventory.transaction.posted',
  TRANSACTION_REVERSED = 'inventory.transaction.reversed',
  RESERVATION_CREATED = 'inventory.reservation.created',
  RESERVATION_CONFIRMED = 'inventory.reservation.confirmed',
  RESERVATION_RELEASED = 'inventory.reservation.released',
  RESERVATION_EXPIRED = 'inventory.reservation.expired',
  RESERVATION_CANCELLED = 'inventory.reservation.cancelled',
  ALLOCATION_CREATED = 'inventory.allocation.created',
  ALLOCATION_ALLOCATED = 'inventory.allocation.allocated',
  ALLOCATION_PARTIALLY_ALLOCATED = 'inventory.allocation.partially_allocated',
  ALLOCATION_SHORTAGE = 'inventory.allocation.shortage',
  ALLOCATION_RELEASED = 'inventory.allocation.released',
  ALLOCATION_CANCELLED = 'inventory.allocation.cancelled',
  ADJUSTMENT_CREATED = 'inventory.adjustment.created',
  ADJUSTMENT_APPROVED = 'inventory.adjustment.approved',
  ADJUSTMENT_REJECTED = 'inventory.adjustment.rejected',
  ADJUSTMENT_POSTED = 'inventory.adjustment.posted',
  ADJUSTMENT_CANCELLED = 'inventory.adjustment.cancelled',
  ADJUSTMENT_REVERSED = 'inventory.adjustment.reversed',
  RECONCILIATION_RUN_STARTED = 'inventory.reconciliation.run_started',
  RECONCILIATION_RUN_COMPLETED = 'inventory.reconciliation.run_completed',
  RECONCILIATION_RUN_CANCELLED = 'inventory.reconciliation.run_cancelled',
  RECONCILIATION_VARIANCE_DETECTED = 'inventory.reconciliation.variance_detected',
  RECONCILIATION_FINDING_APPROVED = 'inventory.reconciliation.finding_approved',
  RECONCILIATION_FINDING_REJECTED = 'inventory.reconciliation.finding_rejected',
  RECONCILIATION_FINDING_IGNORED = 'inventory.reconciliation.finding_ignored',
  RECONCILIATION_FINDING_RESOLVED = 'inventory.reconciliation.finding_resolved',
  RECONCILIATION_FINDING_REOPENED = 'inventory.reconciliation.finding_reopened',
  CYCLE_COUNT_CREATED = 'inventory.cycle_count.created',
  CYCLE_COUNT_SCHEDULED = 'inventory.cycle_count.scheduled',
  CYCLE_COUNT_ASSIGNED = 'inventory.cycle_count.assigned',
  CYCLE_COUNT_STARTED = 'inventory.cycle_count.started',
  CYCLE_COUNT_PAUSED = 'inventory.cycle_count.paused',
  CYCLE_COUNT_RESUMED = 'inventory.cycle_count.resumed',
  CYCLE_COUNT_COMPLETED = 'inventory.cycle_count.completed',
  CYCLE_COUNT_APPROVED = 'inventory.cycle_count.approved',
  CYCLE_COUNT_REJECTED = 'inventory.cycle_count.rejected',
  CYCLE_COUNT_CANCELLED = 'inventory.cycle_count.cancelled',
  CYCLE_COUNT_LINE_COUNTED = 'inventory.cycle_count.line_counted',
  CYCLE_COUNT_LINE_RECOUNT_FLAGGED = 'inventory.cycle_count.line_recount_flagged',
  CYCLE_COUNT_VARIANCE_DETECTED = 'inventory.cycle_count.variance_detected',
  MOVEMENT_CREATED = 'inventory.movement.created',
  MOVEMENT_APPROVED = 'inventory.movement.approved',
  MOVEMENT_EXECUTED = 'inventory.movement.executed',
  MOVEMENT_CANCELLED = 'inventory.movement.cancelled',
  MOVEMENT_REVERSED = 'inventory.movement.reversed',
  TRANSFER_CREATED = 'inventory.transfer.created',
  TRANSFER_APPROVED = 'inventory.transfer.approved',
  TRANSFER_DISPATCHED = 'inventory.transfer.dispatched',
  TRANSFER_RECEIVED = 'inventory.transfer.received',
  TRANSFER_PARTIALLY_RECEIVED = 'inventory.transfer.partially_received',
  TRANSFER_CANCELLED = 'inventory.transfer.cancelled',
  TRANSFER_REVERSED = 'inventory.transfer.reversed',
}

export interface IInventoryItem {
  id: string;
  workspaceId: string;
  sku: string;
  skuSequence: number;
  catalogProductId?: string | null;
  name: string;
  status: InventoryItemStatus;
  trackingType: InventoryTrackingType;
  baseUom: string;
  reorderPoint: number;
  safetyStock: number;
  reorderQuantity: number;
  isExpiryTracked: boolean;
  shelfLifeDays?: number | null;
  version: number;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IInventoryItemHistory {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  fromStatus: InventoryItemStatus;
  toStatus: InventoryItemStatus;
  version: number;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryUnitConversion {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  fromUom: string;
  toUom: string;
  factor: number;
  isBaseConversion: boolean;
}

export interface IInventoryBatch {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  batchNumber: string;
  manufactureDate?: Date | null;
  expiryDate?: Date | null;
  receivedDate: Date;
  supplierId?: string | null;
  quantity: number;
  metadata: Record<string, unknown>;
}

export interface IInventorySerial {
  id: string;
  inventoryItemId: string;
  workspaceId: string;
  batchId?: string | null;
  serialNumber: string;
  status: InventoryStockStatus;
  warehouseId?: string | null;
  locationId?: string | null;
  expiryDate?: Date | null;
  metadata: Record<string, unknown>;
}

export interface IInventoryStock {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  status: InventoryStockStatus;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity: number;
  uom: string;
}

export interface IInventoryTransaction {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId?: string | null;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
  type: InventoryTransactionType;
  status: InventoryTransactionStatus;
  quantity: number;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  uom: string;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  referenceType?: string | null;
  referenceId?: string | null;
  externalReference?: string | null;
  idempotencyKey?: string | null;
  reason?: string | null;
  performedBy?: string | null;
  metadata?: unknown;
  reversalOfId?: string | null;
  reversedAt?: Date | null;
  createdAt: Date;
}

export interface IInventoryConfig {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  valuationMethod: string;
  allowNegativeStock: boolean;
  autoReorderEnabled: boolean;
  expiryAlertDays: number;
  requiresBatchOnReceipt: boolean;
  requiresSerialOnReceipt: boolean;
  metadata: Record<string, unknown>;
}

export interface IInventoryReservationLine {
  id: string;
  reservationId: string;
  workspaceId: string;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity: number;
  status: InventoryReservationLineStatus;
}

export interface IInventoryReservation {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  source: InventoryReservationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  status: InventoryReservationStatus;
  priority: number;
  requestedQuantity: number;
  reservedQuantity: number;
  releasedQuantity: number;
  uom: string;
  expiresAt?: Date | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryReservationHistory {
  id: string;
  reservationId: string;
  workspaceId: string;
  fromStatus?: InventoryReservationStatus | null;
  toStatus: InventoryReservationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryAllocationLine {
  id: string;
  allocationId: string;
  workspaceId: string;
  reservationId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  ownershipType: InventoryOwnershipType;
  ownerRef?: string | null;
  quantity: number;
  score?: number | null;
  reason?: string | null;
  status: InventoryAllocationLineStatus;
}

export interface IInventoryAllocation {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  source: InventoryAllocationSource;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  strategy: InventoryAllocationStrategy;
  status: InventoryAllocationStatus;
  priority: number;
  requestedQuantity: number;
  allocatedQuantity: number;
  releasedQuantity: number;
  uom: string;
  restrictOwnershipType?: InventoryOwnershipType | null;
  reallocationCount: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryAllocationHistory {
  id: string;
  allocationId: string;
  workspaceId: string;
  fromStatus?: InventoryAllocationStatus | null;
  toStatus: InventoryAllocationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryAdjustment {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  type: InventoryAdjustmentType;
  status: InventoryAdjustmentStatus;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus?: InventoryStockStatus | null;
  toStatus?: InventoryStockStatus | null;
  quantity?: number | null;
  quantityDelta?: number | null;
  uom: string;
  unitCost?: number | null;
  quantityBefore?: number | null;
  quantityAfter?: number | null;
  valueBefore?: number | null;
  valueAfter?: number | null;
  reason: string;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  notes?: string | null;
  evidence?: unknown;
  transactionId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  postedBy?: string | null;
  postedAt?: Date | null;
  reversedBy?: string | null;
  reversedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryAdjustmentHistory {
  id: string;
  adjustmentId: string;
  workspaceId: string;
  fromStatus?: InventoryAdjustmentStatus | null;
  toStatus: InventoryAdjustmentStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryReconciliationLine {
  id: string;
  runId: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  status: InventoryStockStatus;
  systemQuantity: number;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  unitCost?: number | null;
  varianceValue?: number | null;
  varianceType: InventoryReconciliationVarianceType;
  classification: InventoryReconciliationClassification;
  findingStatus: InventoryReconciliationFindingStatus;
  adjustmentId?: string | null;
  reason?: string | null;
  notes?: string | null;
  resolvedBy?: string | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryReconciliationRun {
  id: string;
  workspaceId: string;
  sourceType: InventoryReconciliationSourceType;
  trigger: InventoryReconciliationTrigger;
  status: InventoryReconciliationStatus;
  inventoryItemId?: string | null;
  scopeWarehouseId?: string | null;
  periodStart: Date;
  periodEnd: Date;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  totalLines: number;
  matchedCount: number;
  warningCount: number;
  criticalCount: number;
  unresolvedCount: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryReconciliationHistory {
  id: string;
  runId: string;
  workspaceId: string;
  fromStatus?: InventoryReconciliationStatus | null;
  toStatus: InventoryReconciliationStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryReconciliationLineHistory {
  id: string;
  lineId: string;
  workspaceId: string;
  fromStatus?: InventoryReconciliationFindingStatus | null;
  toStatus: InventoryReconciliationFindingStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryCycleCountLine {
  id: string;
  cycleCountId: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId: string;
  locationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  status: InventoryStockStatus;
  expectedQuantity?: number | null;
  countedQuantity?: number | null;
  varianceQuantity?: number | null;
  lineStatus: InventoryCycleCountLineStatus;
  recountCount: number;
  countedBy?: string | null;
  countedAt?: Date | null;
  evidence?: unknown;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryCycleCount {
  id: string;
  workspaceId: string;
  type: InventoryCycleCountType;
  status: InventoryCycleCountStatus;
  scopeWarehouseId?: string | null;
  scopeLocationId?: string | null;
  scopeInventoryItemId?: string | null;
  abcClass?: string | null;
  isBlind: boolean;
  freezeStock: boolean;
  freezeStatuses?: unknown;
  freezeSnapshot?: unknown;
  scheduledAt?: Date | null;
  assignedTo?: string | null;
  assignedBy?: string | null;
  assignedAt?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  reconciliationRunId?: string | null;
  sourceReferenceType?: string | null;
  sourceReferenceId?: string | null;
  totalLines: number;
  countedLines: number;
  varianceLines: number;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryCycleCountHistory {
  id: string;
  cycleCountId: string;
  workspaceId: string;
  fromStatus?: InventoryCycleCountStatus | null;
  toStatus: InventoryCycleCountStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface IInventoryMovement {
  id: string;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  catalogProductId?: string | null;
  variantId?: string | null;
  warehouseId: string;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  batchId?: string | null;
  serialId?: string | null;
  fromStatus: InventoryStockStatus;
  toStatus: InventoryStockStatus;
  quantity: number;
  uom: string;
  status: InventoryMovementStatus;
  reason: string;
  referenceType?: string | null;
  referenceId?: string | null;
  notes?: string | null;
  transactionId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Record<string, unknown> | null;
  createdBy?: string | null;
  approvedBy?: string | null;
  approvedAt?: Date | null;
  executedBy?: string | null;
  executedAt?: Date | null;
  reversedBy?: string | null;
  reversedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryMovementHistory {
  id: string;
  movementId: string;
  workspaceId: string;
  fromStatus?: InventoryMovementStatus | null;
  toStatus: InventoryMovementStatus;
  reason?: string | null;
  changedBy?: string | null;
  snapshot?: unknown;
  createdAt: Date;
}

export interface InventoryJobPayload {
  inventoryItemId: string;
  sku: string;
  workspaceId: string;
  event: InventoryEvent;
  triggeredBy?: string;
  metadata?: Record<string, unknown>;
}

export interface InventoryReservationJobPayload {
  reservationId: string;
  workspaceId: string;
  inventoryItemId: string;
}
