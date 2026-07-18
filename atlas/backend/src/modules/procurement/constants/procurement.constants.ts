import { ProcurementStatus } from '../interfaces';

export const PROCUREMENT_CONSTANTS = {
  NUMBER_PREFIX: 'PO',
  NUMBER_PAD_LENGTH: 6,

  TERMINAL_STATUSES: [
    ProcurementStatus.COMPLETED,
    ProcurementStatus.CANCELLED,
  ] as ProcurementStatus[],

  ACTIVE_STATUSES: [
    ProcurementStatus.DRAFT,
    ProcurementStatus.PENDING_APPROVAL,
    ProcurementStatus.APPROVED,
    ProcurementStatus.ORDERED,
    ProcurementStatus.IN_PROGRESS,
    ProcurementStatus.PARTIALLY_RECEIVED,
  ] as ProcurementStatus[],

  EVENTS: {
    CREATED: 'procurement.created',
    APPROVED: 'procurement.approved',
    ORDERED: 'procurement.ordered',
    COMPLETED: 'procurement.completed',
    CANCELLED: 'procurement.cancelled',
    STATUS_CHANGED: 'procurement.status-changed',
  } as const,

  // Allowed transitions: key = fromStatus, value = allowed toStatuses
  ALLOWED_TRANSITIONS: {
    [ProcurementStatus.DRAFT]: [ProcurementStatus.PENDING_APPROVAL, ProcurementStatus.CANCELLED],
    [ProcurementStatus.PENDING_APPROVAL]: [ProcurementStatus.APPROVED, ProcurementStatus.CANCELLED],
    [ProcurementStatus.APPROVED]: [ProcurementStatus.ORDERED, ProcurementStatus.CANCELLED],
    [ProcurementStatus.ORDERED]: [ProcurementStatus.IN_PROGRESS, ProcurementStatus.CANCELLED],
    [ProcurementStatus.IN_PROGRESS]: [ProcurementStatus.PARTIALLY_RECEIVED, ProcurementStatus.COMPLETED, ProcurementStatus.CANCELLED],
    [ProcurementStatus.PARTIALLY_RECEIVED]: [ProcurementStatus.COMPLETED, ProcurementStatus.CANCELLED],
    [ProcurementStatus.COMPLETED]: [],
    [ProcurementStatus.CANCELLED]: [],
  } as Record<ProcurementStatus, ProcurementStatus[]>,
} as const;

export const PROCUREMENT_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const PROCUREMENT_SORT_FIELDS = [
  'procurementNumber',
  'status',
  'totalCost',
  'expectedDeliveryDate',
  'createdAt',
  'updatedAt',
] as const;
