export const PRODUCT_COST_CONSTANTS = {
  EVENTS: {
    CALCULATED: 'product-cost.calculated',
    RECALCULATED: 'product-cost.recalculated',
  } as const,

  DEFAULT_CURRENCY: 'USD',
  DEFAULT_EXCHANGE_RATE: 1,
} as const;

export const PRODUCT_COST_QUEUE_CONFIG = {
  CONCURRENCY: 5,
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5000,
  REMOVE_ON_COMPLETE_COUNT: 100,
  REMOVE_ON_FAIL_COUNT: 50,
} as const;

export const PRODUCT_COST_SORT_FIELDS = [
  'version',
  'totalLandedCost',
  'costPerUnit',
  'createdAt',
  'updatedAt',
] as const;
