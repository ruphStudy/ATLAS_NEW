import { PricingStatus, PricingStrategy } from '../interfaces';

export const PRICING_CONSTANTS = {
  ALLOWED_TRANSITIONS: {
    [PricingStatus.DRAFT]: [PricingStatus.CALCULATING, PricingStatus.ARCHIVED],
    [PricingStatus.CALCULATING]: [PricingStatus.CALCULATED, PricingStatus.FAILED],
    [PricingStatus.CALCULATED]: [
      PricingStatus.APPROVED,
      PricingStatus.CALCULATING,
      PricingStatus.ARCHIVED,
    ],
    [PricingStatus.APPROVED]: [
      PricingStatus.ACTIVE,
      PricingStatus.CALCULATING,
      PricingStatus.ARCHIVED,
    ],
    [PricingStatus.ACTIVE]: [PricingStatus.CALCULATING, PricingStatus.ARCHIVED],
    [PricingStatus.FAILED]: [PricingStatus.CALCULATING, PricingStatus.ARCHIVED],
    [PricingStatus.ARCHIVED]: [],
  } as Record<PricingStatus, PricingStatus[]>,

  DEFAULT_STRATEGY: PricingStrategy.MARGIN_BASED,
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_COUNTRY: 'GLOBAL',

  DEFAULT_MARGIN_PCT: 30,
  DEFAULT_ROI: 50,
  MIN_MARGIN_PCT: 5,
  MIN_ROI: 10,

  MAX_BULK_ITEMS: 500,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    status: 'status',
    strategy: 'strategy',
    marketplaceKey: 'marketplaceKey',
    estimatedMarginPct: 'estimatedMarginPct',
    suggestedSellingPrice: 'suggestedSellingPrice',
  } as Record<string, string>,
} as const;

export const PRICING_CALCULATION_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 8_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 30,
} as const;

export const PRICING_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_DELAY_MS: 5_000,
  REMOVE_ON_COMPLETE_COUNT: 50,
  REMOVE_ON_FAIL_COUNT: 20,
} as const;
