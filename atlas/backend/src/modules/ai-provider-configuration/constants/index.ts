import { AiConfigStatus } from '../interfaces';

export const AI_CONFIG_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000,
  CACHE_MAX_ENTRIES: 1_000,

  MIN_TIMEOUT_MS: 1_000,
  MAX_TIMEOUT_MS: 120_000,
  MIN_PRIORITY: 0,
  MAX_PRIORITY: 1_000,
  MIN_TEMPERATURE: 0,
  MAX_TEMPERATURE: 2,
  MIN_TOP_P: 0,
  MAX_TOP_P: 1,
  MAX_FALLBACK_CHAIN_LENGTH: 10,

  ALLOWED_TRANSITIONS: {
    [AiConfigStatus.DRAFT]: [AiConfigStatus.PUBLISHED, AiConfigStatus.ARCHIVED],
    [AiConfigStatus.PUBLISHED]: [AiConfigStatus.DISABLED, AiConfigStatus.ARCHIVED],
    [AiConfigStatus.DISABLED]: [AiConfigStatus.PUBLISHED, AiConfigStatus.ARCHIVED],
    [AiConfigStatus.ARCHIVED]: [] as AiConfigStatus[],
  } as Record<AiConfigStatus, AiConfigStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    name: 'name',
    status: 'status',
    version: 'version',
    priority: 'priority',
  } as Record<string, string>,
} as const;
