import { PurchaseOrderStatus } from '../interfaces';

export const PO_CONSTANTS = {
  NUMBER_PREFIX: 'PO',
  NUMBER_PAD_LENGTH: 6,

  EVENTS: {
    CREATED: 'purchase-order.created',
    APPROVED: 'purchase-order.approved',
    ISSUED: 'purchase-order.issued',
    ACKNOWLEDGED: 'purchase-order.acknowledged',
    FULFILLED: 'purchase-order.fulfilled',
    CLOSED: 'purchase-order.closed',
    CANCELLED: 'purchase-order.cancelled',
    REVISED: 'purchase-order.revised',
    STATUS_CHANGED: 'purchase-order.status-changed',
  } as const,

  ALLOWED_TRANSITIONS: {
    [PurchaseOrderStatus.DRAFT]: [PurchaseOrderStatus.PENDING_APPROVAL, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.PENDING_APPROVAL]: [PurchaseOrderStatus.APPROVED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.APPROVED]: [PurchaseOrderStatus.ISSUED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.ISSUED]: [PurchaseOrderStatus.ACKNOWLEDGED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.ACKNOWLEDGED]: [PurchaseOrderStatus.PARTIALLY_FULFILLED, PurchaseOrderStatus.FULFILLED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.PARTIALLY_FULFILLED]: [PurchaseOrderStatus.FULFILLED, PurchaseOrderStatus.CANCELLED],
    [PurchaseOrderStatus.FULFILLED]: [PurchaseOrderStatus.CLOSED],
    [PurchaseOrderStatus.CLOSED]: [],
    [PurchaseOrderStatus.CANCELLED]: [],
  } as Record<PurchaseOrderStatus, PurchaseOrderStatus[]>,

  ACTIVE_STATUSES: [
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.PENDING_APPROVAL,
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.ISSUED,
    PurchaseOrderStatus.ACKNOWLEDGED,
    PurchaseOrderStatus.PARTIALLY_FULFILLED,
  ] as PurchaseOrderStatus[],

  EDITABLE_STATUSES: [PurchaseOrderStatus.DRAFT] as PurchaseOrderStatus[],
} as const;

export const PO_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const PO_SORT_FIELDS = [
  'poNumber',
  'version',
  'status',
  'totalAmount',
  'expectedDeliveryDate',
  'createdAt',
  'updatedAt',
] as const;
