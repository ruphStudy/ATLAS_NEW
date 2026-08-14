import { BrandStatus } from '../interfaces';

export const MULTI_BRAND_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — brand configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  DEFAULT_PRIORITY: 50,

  ALLOWED_BRAND_TRANSITIONS: {
    [BrandStatus.DRAFT]: [BrandStatus.ACTIVE, BrandStatus.ARCHIVED],
    [BrandStatus.ACTIVE]: [BrandStatus.INACTIVE, BrandStatus.ARCHIVED],
    [BrandStatus.INACTIVE]: [BrandStatus.ACTIVE, BrandStatus.ARCHIVED],
    [BrandStatus.ARCHIVED]: [BrandStatus.ACTIVE], // restore path only
  } as Record<BrandStatus, BrandStatus[]>,

  MUTABLE_BRAND_STATUSES: new Set<BrandStatus>([BrandStatus.DRAFT]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    name: 'name',
    code: 'code',
  } as Record<string, string>,
} as const;

export const MULTI_BRAND_ERROR_CODES = {
  BRAND_NOT_FOUND: 'MULTI_BRAND_NOT_FOUND',
  BRAND_DUPLICATE_CODE: 'MULTI_BRAND_DUPLICATE_CODE',
  INVALID_BRAND: 'MULTI_BRAND_INVALID_BRAND',
  INVALID_TRANSITION: 'MULTI_BRAND_INVALID_TRANSITION',
  DEFAULT_BRAND_PROTECTED: 'MULTI_BRAND_DEFAULT_BRAND_PROTECTED',
  LINK_ALREADY_EXISTS: 'MULTI_BRAND_LINK_ALREADY_EXISTS',
  LINK_NOT_FOUND: 'MULTI_BRAND_LINK_NOT_FOUND',
  INVALID_CROSS_BRAND_ASSIGNMENT: 'MULTI_BRAND_INVALID_CROSS_BRAND_ASSIGNMENT',
} as const;

export const MULTI_BRAND_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const MULTI_BRAND_MODULE = 'multi-brand';
