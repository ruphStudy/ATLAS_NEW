import { BusinessStatus } from '../interfaces';

export const MULTI_BUSINESS_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — business configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  DEFAULT_PRIORITY: 50,

  ALLOWED_BUSINESS_TRANSITIONS: {
    [BusinessStatus.DRAFT]: [BusinessStatus.ACTIVE, BusinessStatus.ARCHIVED],
    [BusinessStatus.ACTIVE]: [BusinessStatus.SUSPENDED, BusinessStatus.ARCHIVED],
    [BusinessStatus.SUSPENDED]: [BusinessStatus.ACTIVE, BusinessStatus.ARCHIVED],
    [BusinessStatus.ARCHIVED]: [BusinessStatus.ACTIVE], // restore path only
  } as Record<BusinessStatus, BusinessStatus[]>,

  MUTABLE_BUSINESS_STATUSES: new Set<BusinessStatus>([BusinessStatus.DRAFT]),

  /** Bound on how many hops hierarchy-cycle detection will walk — the business tree is small in practice. */
  HIERARCHY_MAX_DEPTH: 20,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    name: 'name',
    code: 'code',
  } as Record<string, string>,
} as const;

export const MULTI_BUSINESS_ERROR_CODES = {
  BUSINESS_NOT_FOUND: 'MULTI_BUSINESS_NOT_FOUND',
  BUSINESS_DUPLICATE_CODE: 'MULTI_BUSINESS_DUPLICATE_CODE',
  DUPLICATE_LEGAL_IDENTITY: 'MULTI_BUSINESS_DUPLICATE_LEGAL_IDENTITY',
  INVALID_BUSINESS: 'MULTI_BUSINESS_INVALID_BUSINESS',
  INVALID_TRANSITION: 'MULTI_BUSINESS_INVALID_TRANSITION',
  DEFAULT_BUSINESS_PROTECTED: 'MULTI_BUSINESS_DEFAULT_PROTECTED',
  HIERARCHY_CYCLE: 'MULTI_BUSINESS_HIERARCHY_CYCLE',
  LINK_ALREADY_EXISTS: 'MULTI_BUSINESS_LINK_ALREADY_EXISTS',
  LINK_NOT_FOUND: 'MULTI_BUSINESS_LINK_NOT_FOUND',
  INVALID_CROSS_BUSINESS_ASSIGNMENT: 'MULTI_BUSINESS_INVALID_CROSS_BUSINESS_ASSIGNMENT',
} as const;

export const MULTI_BUSINESS_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const MULTI_BUSINESS_MODULE = 'multi-business';
