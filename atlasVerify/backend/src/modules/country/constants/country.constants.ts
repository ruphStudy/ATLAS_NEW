import { CountryStatus } from '../interfaces';

export const COUNTRY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_TTL_MS: 300_000, // 5 min — country registry entries change rarely
  RESOLUTION_CACHE_TTL_MS: 120_000, // 2 min — matches marketplace-capability resolution cache
  CACHE_MAX_ENTRIES: 1_000,
  RESOLUTION_CACHE_MAX: 2_000,
  DEFAULT_PRIORITY: 50,

  ALLOWED_TRANSITIONS: {
    [CountryStatus.DRAFT]: [CountryStatus.ACTIVE, CountryStatus.ARCHIVED],
    [CountryStatus.ACTIVE]: [CountryStatus.DISABLED, CountryStatus.DEPRECATED, CountryStatus.ARCHIVED],
    [CountryStatus.DISABLED]: [CountryStatus.ACTIVE, CountryStatus.ARCHIVED],
    [CountryStatus.DEPRECATED]: [CountryStatus.ARCHIVED, CountryStatus.ACTIVE],
    [CountryStatus.ARCHIVED]: [CountryStatus.DRAFT] as CountryStatus[], // restore path only
  } as Record<CountryStatus, CountryStatus[]>,

  MUTABLE_STATUSES: new Set<CountryStatus>([
    CountryStatus.DRAFT,
    CountryStatus.ACTIVE,
    CountryStatus.DISABLED,
    CountryStatus.DEPRECATED,
  ]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    code: 'code',
    name: 'name',
    status: 'status',
  } as Record<string, string>,
} as const;

export const COUNTRY_ERROR_CODES = {
  NOT_FOUND: 'COUNTRY_NOT_FOUND',
  DUPLICATE: 'COUNTRY_DUPLICATE',
  INVALID_TRANSITION: 'COUNTRY_INVALID_TRANSITION',
  IMMUTABLE: 'COUNTRY_IMMUTABLE',
  NOT_ENABLED: 'COUNTRY_NOT_ENABLED_FOR_WORKSPACE',
  VALIDATION_FAILED: 'COUNTRY_VALIDATION_FAILED',
} as const;

export const COUNTRY_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const COUNTRY_MODULE = 'country';
