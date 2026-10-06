import { CapabilityStatus } from '../interfaces';

export const MP_CAPABILITY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_TTL_MS: 300_000,       // 5 min
  RESOLUTION_CACHE_TTL_MS: 120_000, // 2 min
  COMPAT_CACHE_TTL_MS: 600_000, // 10 min
  CACHE_MAX_ENTRIES: 2_000,
  RESOLUTION_CACHE_MAX: 5_000,
  MAX_DEPENDENCY_DEPTH: 10,
  MATRIX_CACHE_TTL_MS: 120_000, // 2 min — same lifetime as individual resolutions
  MATRIX_CACHE_MAX_ENTRIES: 500,

  ALLOWED_TRANSITIONS: {
    [CapabilityStatus.DRAFT]: [
      CapabilityStatus.ACTIVE,
      CapabilityStatus.ARCHIVED,
      CapabilityStatus.EXPERIMENTAL,
    ],
    [CapabilityStatus.ACTIVE]: [
      CapabilityStatus.DISABLED,
      CapabilityStatus.DEPRECATED,
      CapabilityStatus.ARCHIVED,
    ],
    [CapabilityStatus.DISABLED]: [
      CapabilityStatus.ACTIVE,
      CapabilityStatus.ARCHIVED,
    ],
    [CapabilityStatus.DEPRECATED]: [
      CapabilityStatus.ARCHIVED,
      CapabilityStatus.ACTIVE,
    ],
    [CapabilityStatus.EXPERIMENTAL]: [
      CapabilityStatus.ACTIVE,
      CapabilityStatus.DISABLED,
      CapabilityStatus.ARCHIVED,
    ],
    [CapabilityStatus.ARCHIVED]: [] as CapabilityStatus[],
    [CapabilityStatus.UNSUPPORTED]: [] as CapabilityStatus[],
  } as Record<CapabilityStatus, CapabilityStatus[]>,

  MUTABLE_STATUSES: new Set<CapabilityStatus>([
    CapabilityStatus.DRAFT,
    CapabilityStatus.ACTIVE,
    CapabilityStatus.DISABLED,
    CapabilityStatus.DEPRECATED,
    CapabilityStatus.EXPERIMENTAL,
  ]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    capabilityKey: 'capabilityKey',
    name: 'name',
    status: 'status',
    version: 'version',
    category: 'category',
  } as Record<string, string>,
} as const;

export const MP_CAPABILITY_ERROR_CODES = {
  NOT_FOUND: 'CAPABILITY_NOT_FOUND',
  DUPLICATE: 'CAPABILITY_DUPLICATE',
  INVALID_TRANSITION: 'CAPABILITY_INVALID_TRANSITION',
  IMMUTABLE: 'CAPABILITY_IMMUTABLE',
  DEPENDENCY_NOT_FOUND: 'CAPABILITY_DEPENDENCY_NOT_FOUND',
  CIRCULAR_DEPENDENCY: 'CAPABILITY_CIRCULAR_DEPENDENCY',
  PROVIDER_NOT_DECLARED: 'CAPABILITY_PROVIDER_NOT_DECLARED',
  VALIDATION_FAILED: 'CAPABILITY_VALIDATION_FAILED',
  COMPATIBILITY_FAILED: 'CAPABILITY_COMPATIBILITY_FAILED',
  MISSING_REQUIRED_FIELD: 'CAPABILITY_MISSING_REQUIRED_FIELD',
  OVERRIDE_NOT_FOUND: 'CAPABILITY_OVERRIDE_NOT_FOUND',
} as const;

export const MP_CAPABILITY_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;
