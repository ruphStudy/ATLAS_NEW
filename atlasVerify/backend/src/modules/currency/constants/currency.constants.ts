import { CurrencyStatus, RateStatus } from '../interfaces';

export const CURRENCY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_TTL_MS: 300_000, // 5 min — currency registry entries change rarely
  RATE_CACHE_TTL_MS: 60_000, // 1 min — current-rate resolutions should refresh often
  CACHE_MAX_ENTRIES: 1_000,
  RATE_CACHE_MAX: 5_000,

  DEFAULT_DECIMALS: 2,
  DEFAULT_ROUNDING_MODE: 'HALF_UP',
  DEFAULT_STALE_TOLERANCE_MINUTES: 1_440, // 24h
  /** Tried in order (after direct/inverse fail) to compute a cross-rate — currency codes only, never rate values. */
  DEFAULT_PIVOT_CURRENCIES: ['USD', 'EUR'] as string[],
  DEFAULT_RATE_TYPE: 'SPOT',
  /** A newly submitted rate deviating more than this fraction from the last published rate for the same pair is flagged abnormal (warning, not a rejection). */
  DEFAULT_ABNORMAL_DEVIATION_THRESHOLD: 0.2,
  DEFAULT_PROVIDER_PRIORITY: 50,
  DEFAULT_SYNC_INTERVAL_MS: 3_600_000, // 1h

  ALLOWED_TRANSITIONS: {
    [CurrencyStatus.DRAFT]: [CurrencyStatus.ACTIVE, CurrencyStatus.ARCHIVED],
    [CurrencyStatus.ACTIVE]: [CurrencyStatus.DISABLED, CurrencyStatus.ARCHIVED],
    [CurrencyStatus.DISABLED]: [CurrencyStatus.ACTIVE, CurrencyStatus.ARCHIVED],
    [CurrencyStatus.ARCHIVED]: [CurrencyStatus.DRAFT] as CurrencyStatus[], // restore path only
  } as Record<CurrencyStatus, CurrencyStatus[]>,

  MUTABLE_STATUSES: new Set<CurrencyStatus>([
    CurrencyStatus.DRAFT,
    CurrencyStatus.ACTIVE,
    CurrencyStatus.DISABLED,
  ]),

  /** Rate-level lifecycle transitions — create/import → (approve →) publish → archive, or reject. */
  ALLOWED_RATE_TRANSITIONS: {
    [RateStatus.DRAFT]: [RateStatus.PENDING_APPROVAL, RateStatus.PUBLISHED, RateStatus.ARCHIVED],
    [RateStatus.PENDING_APPROVAL]: [RateStatus.APPROVED, RateStatus.REJECTED],
    [RateStatus.APPROVED]: [RateStatus.PUBLISHED, RateStatus.ARCHIVED],
    [RateStatus.PUBLISHED]: [RateStatus.ARCHIVED],
    [RateStatus.REJECTED]: [RateStatus.ARCHIVED] as RateStatus[],
    [RateStatus.ARCHIVED]: [] as RateStatus[],
  } as Record<RateStatus, RateStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    code: 'code',
    name: 'name',
    status: 'status',
  } as Record<string, string>,
} as const;

export const CURRENCY_ERROR_CODES = {
  NOT_FOUND: 'CURRENCY_NOT_FOUND',
  DUPLICATE: 'CURRENCY_DUPLICATE',
  INVALID_TRANSITION: 'CURRENCY_INVALID_TRANSITION',
  IMMUTABLE: 'CURRENCY_IMMUTABLE',
  INVALID_RATE: 'CURRENCY_INVALID_RATE',
  DUPLICATE_RATE: 'CURRENCY_DUPLICATE_RATE',
  RATE_NOT_FOUND: 'CURRENCY_RATE_NOT_FOUND',
  STALE_RATE: 'CURRENCY_STALE_RATE',
  PROVIDER_NOT_REGISTERED: 'CURRENCY_PROVIDER_NOT_REGISTERED',
  INVALID_RATE_TRANSITION: 'CURRENCY_INVALID_RATE_TRANSITION',
  NO_PROVIDER_AVAILABLE: 'CURRENCY_NO_PROVIDER_AVAILABLE',
} as const;

export const CURRENCY_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const CURRENCY_MODULE = 'currency';
