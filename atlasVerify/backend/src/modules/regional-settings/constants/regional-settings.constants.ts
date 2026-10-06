import { RegionalSettingsStatus } from '../interfaces';

export const REGIONAL_SETTINGS_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  PROFILE_CACHE_TTL_MS: 300_000, // 5 min — profiles change rarely
  RESOLUTION_CACHE_TTL_MS: 60_000, // 1 min
  CACHE_MAX_ENTRIES: 1_000,
  RESOLUTION_CACHE_MAX: 5_000,

  DEFAULT_PRIORITY: 50,

  ALLOWED_PROFILE_TRANSITIONS: {
    [RegionalSettingsStatus.DRAFT]: [RegionalSettingsStatus.PUBLISHED, RegionalSettingsStatus.ARCHIVED],
    [RegionalSettingsStatus.PUBLISHED]: [RegionalSettingsStatus.ARCHIVED],
    [RegionalSettingsStatus.ARCHIVED]: [] as RegionalSettingsStatus[],
  } as Record<RegionalSettingsStatus, RegionalSettingsStatus[]>,

  MUTABLE_PROFILE_STATUSES: new Set<RegionalSettingsStatus>([RegionalSettingsStatus.DRAFT]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    key: 'key',
    effectiveFrom: 'effectiveFrom',
  } as Record<string, string>,
} as const;

export const REGIONAL_SETTINGS_ERROR_CODES = {
  PROFILE_NOT_FOUND: 'REGIONAL_SETTINGS_PROFILE_NOT_FOUND',
  PROFILE_DUPLICATE: 'REGIONAL_SETTINGS_PROFILE_DUPLICATE',
  INVALID_PROFILE: 'REGIONAL_SETTINGS_INVALID_PROFILE',
  INVALID_TRANSITION: 'REGIONAL_SETTINGS_INVALID_TRANSITION',
  HISTORY_VERSION_NOT_FOUND: 'REGIONAL_SETTINGS_HISTORY_VERSION_NOT_FOUND',
} as const;

export const REGIONAL_SETTINGS_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const REGIONAL_SETTINGS_MODULE = 'regional-settings';

/** Ranks scope specificity for precedence resolution — a later entry always outranks every earlier one. */
export const REGIONAL_SETTINGS_SCOPE_PRECEDENCE = ['GLOBAL', 'COUNTRY', 'REGION', 'ORGANIZATION', 'WORKSPACE'] as const;
