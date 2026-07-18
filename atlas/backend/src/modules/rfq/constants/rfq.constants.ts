export const RFQ_CONSTANTS = {
  NUMBER_PREFIX: 'RFQ',
  NUMBER_PAD_LENGTH: 6,

  // Statuses that allow new RFQ creation for the same product
  INACTIVE_STATUSES: ['EXPIRED', 'CANCELLED', 'CLOSED'],

  // Events
  EVENTS: {
    CREATED: 'rfq.created',
    SENT: 'rfq.sent',
    RESPONDED: 'rfq.responded',
    EXPIRED: 'rfq.expired',
    CANCELLED: 'rfq.cancelled',
    CLOSED: 'rfq.closed',
  } as const,
} as const;

export const RFQ_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export type RfqEventName = (typeof RFQ_CONSTANTS.EVENTS)[keyof typeof RFQ_CONSTANTS.EVENTS];
