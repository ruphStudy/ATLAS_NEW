import {
  InventoryAdjustmentStatus,
  InventoryAdjustmentType,
  InventoryAllocationStatus,
  InventoryCycleCountLineStatus,
  InventoryCycleCountStatus,
  InventoryItemStatus,
  InventoryMovementStatus,
  InventoryReconciliationFindingStatus,
  InventoryReconciliationStatus,
  InventoryReservationStatus,
  InventoryStockStatus,
  InventoryTransactionType,
  InventoryTransferStatus,
} from '../interfaces';

export const INVENTORY_CONSTANTS = {
  SKU_PREFIX: 'INV',
  SKU_PAD_LENGTH: 7,
  INITIAL_VERSION: 1,
  DEFAULT_UOM: 'EA',
  DEFAULT_VALUATION_METHOD: 'FIFO',
  DEFAULT_EXPIRY_ALERT_DAYS: 30,

  ALLOWED_TRANSITIONS: {
    [InventoryItemStatus.DRAFT]: [InventoryItemStatus.ACTIVE, InventoryItemStatus.ARCHIVED],
    [InventoryItemStatus.ACTIVE]: [InventoryItemStatus.INACTIVE, InventoryItemStatus.DISCONTINUED],
    [InventoryItemStatus.INACTIVE]: [InventoryItemStatus.ACTIVE, InventoryItemStatus.DISCONTINUED],
    [InventoryItemStatus.DISCONTINUED]: [InventoryItemStatus.ARCHIVED, InventoryItemStatus.ACTIVE],
    [InventoryItemStatus.ARCHIVED]: [],
  } as Record<InventoryItemStatus, InventoryItemStatus[]>,

  // Stock-bucket status transitions (e.g. AVAILABLE -> RESERVED on order placement,
  // RESERVED -> AVAILABLE on cancellation, AVAILABLE -> DAMAGED on inspection failure).
  ALLOWED_STOCK_TRANSITIONS: {
    [InventoryStockStatus.AVAILABLE]: [
      InventoryStockStatus.RESERVED,
      InventoryStockStatus.DAMAGED,
      InventoryStockStatus.LOST,
      InventoryStockStatus.IN_TRANSIT,
      InventoryStockStatus.BLOCKED,
    ],
    [InventoryStockStatus.RESERVED]: [
      InventoryStockStatus.AVAILABLE,
      InventoryStockStatus.DAMAGED,
      InventoryStockStatus.LOST,
    ],
    [InventoryStockStatus.IN_TRANSIT]: [
      InventoryStockStatus.AVAILABLE,
      InventoryStockStatus.DAMAGED,
      InventoryStockStatus.LOST,
    ],
    [InventoryStockStatus.BLOCKED]: [InventoryStockStatus.AVAILABLE, InventoryStockStatus.DAMAGED],
    [InventoryStockStatus.DAMAGED]: [InventoryStockStatus.LOST, InventoryStockStatus.AVAILABLE],
    [InventoryStockStatus.LOST]: [],
  } as Record<InventoryStockStatus, InventoryStockStatus[]>,

  // Transaction types that mutate a single well-defined stock bucket (or a
  // from/to pair within the same warehouse/location/batch), and therefore
  // support a generic, symmetric reversal.
  REVERSIBLE_TRANSACTION_TYPES: [
    InventoryTransactionType.RECEIPT,
    InventoryTransactionType.ISSUE,
    InventoryTransactionType.DISPATCH,
    InventoryTransactionType.RETURN,
    InventoryTransactionType.ADJUSTMENT,
    InventoryTransactionType.RESERVE,
    InventoryTransactionType.RELEASE,
    InventoryTransactionType.STATUS_CHANGE,
    InventoryTransactionType.TRANSFER,
  ] as InventoryTransactionType[],

  // Reservation lifecycle transitions (create -> confirm -> release/expire/cancel).
  ALLOWED_RESERVATION_TRANSITIONS: {
    [InventoryReservationStatus.PENDING]: [
      InventoryReservationStatus.CONFIRMED,
      InventoryReservationStatus.CANCELLED,
      InventoryReservationStatus.EXPIRED,
    ],
    [InventoryReservationStatus.CONFIRMED]: [
      InventoryReservationStatus.RELEASED,
      InventoryReservationStatus.EXPIRED,
      InventoryReservationStatus.CANCELLED,
    ],
    [InventoryReservationStatus.RELEASED]: [],
    [InventoryReservationStatus.EXPIRED]: [],
    [InventoryReservationStatus.CANCELLED]: [],
  } as Record<InventoryReservationStatus, InventoryReservationStatus[]>,

  // Allocation lifecycle transitions. Partial fulfilment is tracked numerically
  // (allocatedQuantity vs requestedQuantity) rather than as separate statuses,
  // so ALLOCATED/PARTIALLY_ALLOCATED/SHORTAGE stay mutually reachable via reallocate().
  ALLOWED_ALLOCATION_TRANSITIONS: {
    [InventoryAllocationStatus.PENDING]: [
      InventoryAllocationStatus.ALLOCATED,
      InventoryAllocationStatus.PARTIALLY_ALLOCATED,
      InventoryAllocationStatus.SHORTAGE,
      InventoryAllocationStatus.CANCELLED,
    ],
    [InventoryAllocationStatus.ALLOCATED]: [
      InventoryAllocationStatus.RELEASED,
      InventoryAllocationStatus.CANCELLED,
    ],
    [InventoryAllocationStatus.PARTIALLY_ALLOCATED]: [
      InventoryAllocationStatus.ALLOCATED,
      InventoryAllocationStatus.PARTIALLY_ALLOCATED,
      InventoryAllocationStatus.SHORTAGE,
      InventoryAllocationStatus.RELEASED,
      InventoryAllocationStatus.CANCELLED,
    ],
    [InventoryAllocationStatus.SHORTAGE]: [
      InventoryAllocationStatus.ALLOCATED,
      InventoryAllocationStatus.PARTIALLY_ALLOCATED,
      InventoryAllocationStatus.SHORTAGE,
      InventoryAllocationStatus.CANCELLED,
    ],
    [InventoryAllocationStatus.RELEASED]: [],
    [InventoryAllocationStatus.CANCELLED]: [],
  } as Record<InventoryAllocationStatus, InventoryAllocationStatus[]>,

  // Adjustment lifecycle: create -> (auto-approve | approve/reject) -> post -> reverse.
  ALLOWED_ADJUSTMENT_TRANSITIONS: {
    [InventoryAdjustmentStatus.PENDING_APPROVAL]: [
      InventoryAdjustmentStatus.APPROVED,
      InventoryAdjustmentStatus.REJECTED,
      InventoryAdjustmentStatus.CANCELLED,
    ],
    [InventoryAdjustmentStatus.APPROVED]: [
      InventoryAdjustmentStatus.POSTED,
      InventoryAdjustmentStatus.CANCELLED,
    ],
    [InventoryAdjustmentStatus.POSTED]: [InventoryAdjustmentStatus.REVERSED],
    [InventoryAdjustmentStatus.REJECTED]: [],
    [InventoryAdjustmentStatus.CANCELLED]: [],
    [InventoryAdjustmentStatus.REVERSED]: [],
  } as Record<InventoryAdjustmentStatus, InventoryAdjustmentStatus[]>,

  // Reconciliation run lifecycle: a run computes its comparison synchronously,
  // so PENDING is a transient row-creation state before COMPLETED/CANCELLED.
  ALLOWED_RECONCILIATION_RUN_TRANSITIONS: {
    [InventoryReconciliationStatus.PENDING]: [
      InventoryReconciliationStatus.COMPLETED,
      InventoryReconciliationStatus.CANCELLED,
    ],
    [InventoryReconciliationStatus.COMPLETED]: [InventoryReconciliationStatus.CANCELLED],
    [InventoryReconciliationStatus.CANCELLED]: [],
  } as Record<InventoryReconciliationStatus, InventoryReconciliationStatus[]>,

  // Per-finding lifecycle: approve/reject/ignore/resolve are all reachable from
  // OPEN, and every terminal state may be reopened for re-review.
  ALLOWED_RECONCILIATION_FINDING_TRANSITIONS: {
    [InventoryReconciliationFindingStatus.OPEN]: [
      InventoryReconciliationFindingStatus.APPROVED,
      InventoryReconciliationFindingStatus.REJECTED,
      InventoryReconciliationFindingStatus.IGNORED,
      InventoryReconciliationFindingStatus.RESOLVED,
    ],
    [InventoryReconciliationFindingStatus.APPROVED]: [
      InventoryReconciliationFindingStatus.RESOLVED,
      InventoryReconciliationFindingStatus.OPEN,
    ],
    [InventoryReconciliationFindingStatus.REJECTED]: [InventoryReconciliationFindingStatus.OPEN],
    [InventoryReconciliationFindingStatus.IGNORED]: [InventoryReconciliationFindingStatus.OPEN],
    [InventoryReconciliationFindingStatus.RESOLVED]: [InventoryReconciliationFindingStatus.OPEN],
  } as Record<InventoryReconciliationFindingStatus, InventoryReconciliationFindingStatus[]>,

  // Cycle count lifecycle: create -> schedule/assign -> start -> pause/complete ->
  // approve/reject -> cancel. COMPLETED allows direct reentry to IN_PROGRESS so a
  // single flagged line (or a whole-count reject) can trigger a recount without
  // resurrecting a terminal state.
  ALLOWED_CYCLE_COUNT_TRANSITIONS: {
    [InventoryCycleCountStatus.DRAFT]: [
      InventoryCycleCountStatus.SCHEDULED,
      InventoryCycleCountStatus.ASSIGNED,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.SCHEDULED]: [
      InventoryCycleCountStatus.ASSIGNED,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.ASSIGNED]: [
      InventoryCycleCountStatus.IN_PROGRESS,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.IN_PROGRESS]: [
      InventoryCycleCountStatus.PAUSED,
      InventoryCycleCountStatus.COMPLETED,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.PAUSED]: [
      InventoryCycleCountStatus.IN_PROGRESS,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.COMPLETED]: [
      InventoryCycleCountStatus.APPROVED,
      InventoryCycleCountStatus.REJECTED,
      InventoryCycleCountStatus.IN_PROGRESS,
      InventoryCycleCountStatus.CANCELLED,
    ],
    [InventoryCycleCountStatus.REJECTED]: [InventoryCycleCountStatus.IN_PROGRESS],
    [InventoryCycleCountStatus.APPROVED]: [],
    [InventoryCycleCountStatus.CANCELLED]: [],
  } as Record<InventoryCycleCountStatus, InventoryCycleCountStatus[]>,

  ALLOWED_CYCLE_COUNT_LINE_TRANSITIONS: {
    [InventoryCycleCountLineStatus.PENDING]: [
      InventoryCycleCountLineStatus.COUNTED,
      InventoryCycleCountLineStatus.RECOUNT_REQUIRED,
    ],
    [InventoryCycleCountLineStatus.COUNTED]: [
      InventoryCycleCountLineStatus.RECOUNT_REQUIRED,
      InventoryCycleCountLineStatus.VERIFIED,
    ],
    [InventoryCycleCountLineStatus.RECOUNT_REQUIRED]: [InventoryCycleCountLineStatus.COUNTED],
    [InventoryCycleCountLineStatus.VERIFIED]: [InventoryCycleCountLineStatus.RECOUNT_REQUIRED],
  } as Record<InventoryCycleCountLineStatus, InventoryCycleCountLineStatus[]>,

  // Movement lifecycle: create -> approve -> execute -> reverse; cancel is
  // reachable pre-execution from either PENDING_APPROVAL or APPROVED.
  ALLOWED_MOVEMENT_TRANSITIONS: {
    [InventoryMovementStatus.PENDING_APPROVAL]: [
      InventoryMovementStatus.APPROVED,
      InventoryMovementStatus.CANCELLED,
    ],
    [InventoryMovementStatus.APPROVED]: [
      InventoryMovementStatus.EXECUTED,
      InventoryMovementStatus.CANCELLED,
    ],
    [InventoryMovementStatus.EXECUTED]: [InventoryMovementStatus.REVERSED],
    [InventoryMovementStatus.CANCELLED]: [],
    [InventoryMovementStatus.REVERSED]: [],
  } as Record<InventoryMovementStatus, InventoryMovementStatus[]>,

  // Transfer lifecycle: create -> approve -> dispatch -> in-transit -> receive/partially receive -> reverse.
  // Cancel is reachable from PENDING or APPROVED only.
  ALLOWED_TRANSFER_TRANSITIONS: {
    [InventoryTransferStatus.PENDING]: [
      InventoryTransferStatus.APPROVED,
      InventoryTransferStatus.CANCELLED,
    ],
    [InventoryTransferStatus.APPROVED]: [
      InventoryTransferStatus.DISPATCHED,
      InventoryTransferStatus.CANCELLED,
    ],
    [InventoryTransferStatus.DISPATCHED]: [InventoryTransferStatus.IN_TRANSIT],
    [InventoryTransferStatus.IN_TRANSIT]: [
      InventoryTransferStatus.RECEIVED,
      InventoryTransferStatus.PARTIALLY_RECEIVED,
    ],
    [InventoryTransferStatus.PARTIALLY_RECEIVED]: [
      InventoryTransferStatus.RECEIVED,
      InventoryTransferStatus.PARTIALLY_RECEIVED,
      InventoryTransferStatus.REVERSED,
    ],
    [InventoryTransferStatus.RECEIVED]: [InventoryTransferStatus.REVERSED],
    [InventoryTransferStatus.CANCELLED]: [],
    [InventoryTransferStatus.REVERSED]: [],
  } as Record<InventoryTransferStatus, InventoryTransferStatus[]>,
} as const;

export const INVENTORY_ADJUSTMENT_CONSTANTS = {
  // Adjustment types that always require approval regardless of size, since they
  // represent stock write-offs rather than routine corrections.
  ALWAYS_REQUIRE_APPROVAL_TYPES: [
    InventoryAdjustmentType.DAMAGE,
    InventoryAdjustmentType.LOSS,
    InventoryAdjustmentType.EXPIRY,
  ] as InventoryAdjustmentType[],
  // Roles that may auto-approve adjustments within AUTO_APPROVE_MAX_QUANTITY/VALUE.
  AUTO_APPROVE_ROLES: ['OWNER', 'ADMIN'] as string[],
  AUTO_APPROVE_MAX_QUANTITY: 50,
  AUTO_APPROVE_MAX_VALUE: 1_000,
} as const;

export const INVENTORY_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;

export const INVENTORY_RESERVATION_CONSTANTS = {
  DEFAULT_EXPIRY_MINUTES: 30,
  SYSTEM_ACTOR: 'system:reservation-expiry',
} as const;

export const INVENTORY_RECONCILIATION_CONSTANTS = {
  // A variance within these bounds (by absolute quantity OR percentage of system
  // quantity) is considered MATCHED — no action needed.
  MATCHED_MAX_QUANTITY: 0,
  MATCHED_MAX_PERCENTAGE: 0.01,
  // Beyond MATCHED but within these bounds (by quantity, percentage, or value) is
  // a WARNING; beyond that is CRITICAL. DUPLICATE/STALE findings are always
  // UNRESOLVED regardless of magnitude, since they need manual investigation.
  WARNING_MAX_QUANTITY: 5,
  WARNING_MAX_PERCENTAGE: 0.05,
  WARNING_MAX_VALUE: 500,
  // A system bucket with stock that wasn't included in a submitted count and
  // hasn't moved in this many days is flagged as a STALE finding.
  STALE_AFTER_DAYS: 30,
} as const;

export const INVENTORY_CYCLE_COUNT_CONSTANTS = {
  DEFAULT_FREEZE_STATUSES: [InventoryStockStatus.AVAILABLE] as InventoryStockStatus[],
  FREEZE_REASON: 'Cycle count freeze',
  UNFREEZE_REASON: 'Cycle count freeze released',
} as const;

export const INVENTORY_ITEM_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  name: 'name',
  sku: 'sku',
  status: 'status',
  version: 'version',
};

export const INVENTORY_STOCK_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  quantity: 'quantity',
  status: 'status',
};

export const INVENTORY_BATCH_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  expiryDate: 'expiryDate',
  manufactureDate: 'manufactureDate',
  receivedDate: 'receivedDate',
  batchNumber: 'batchNumber',
  quantity: 'quantity',
};

export const INVENTORY_SERIAL_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  serialNumber: 'serialNumber',
  status: 'status',
  expiryDate: 'expiryDate',
};

export const INVENTORY_TRANSACTION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  quantity: 'quantity',
  quantityBefore: 'quantityBefore',
  quantityAfter: 'quantityAfter',
  type: 'type',
  status: 'status',
};

export const INVENTORY_RESERVATION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priority',
  expiresAt: 'expiresAt',
  requestedQuantity: 'requestedQuantity',
  reservedQuantity: 'reservedQuantity',
  status: 'status',
};

export const INVENTORY_ALLOCATION_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  priority: 'priority',
  requestedQuantity: 'requestedQuantity',
  allocatedQuantity: 'allocatedQuantity',
  status: 'status',
  strategy: 'strategy',
};

export const INVENTORY_ADJUSTMENT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  postedAt: 'postedAt',
  quantity: 'quantity',
  status: 'status',
  type: 'type',
};

export const INVENTORY_RECONCILIATION_RUN_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  periodStart: 'periodStart',
  periodEnd: 'periodEnd',
  status: 'status',
  sourceType: 'sourceType',
  totalLines: 'totalLines',
  criticalCount: 'criticalCount',
};

export const INVENTORY_RECONCILIATION_LINE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  varianceQuantity: 'varianceQuantity',
  varianceValue: 'varianceValue',
  classification: 'classification',
  findingStatus: 'findingStatus',
  varianceType: 'varianceType',
};

export const INVENTORY_CYCLE_COUNT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  scheduledAt: 'scheduledAt',
  startedAt: 'startedAt',
  completedAt: 'completedAt',
  status: 'status',
  type: 'type',
};

export const INVENTORY_CYCLE_COUNT_LINE_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  varianceQuantity: 'varianceQuantity',
  lineStatus: 'lineStatus',
  countedAt: 'countedAt',
};

export const INVENTORY_MOVEMENT_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  approvedAt: 'approvedAt',
  executedAt: 'executedAt',
  quantity: 'quantity',
  status: 'status',
};

export const INVENTORY_TRANSFER_SORT_FIELDS: Record<string, string> = {
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
  transferNumber: 'transferNumber',
  dispatchedAt: 'dispatchedAt',
  receivedAt: 'receivedAt',
  status: 'status',
};
