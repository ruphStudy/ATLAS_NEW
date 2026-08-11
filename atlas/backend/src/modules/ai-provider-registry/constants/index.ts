import { ProviderRegistrationStatus } from '../interfaces';

export const AI_PROVIDER_REGISTRY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000,
  CACHE_MAX_ENTRIES: 1_000,

  MIN_PRIORITY: 0,
  MAX_PRIORITY: 1_000,
  MAX_FALLBACK_CHAIN_LENGTH: 10,

  ALLOWED_TRANSITIONS: {
    [ProviderRegistrationStatus.PENDING]: [
      ProviderRegistrationStatus.ACTIVE,
      ProviderRegistrationStatus.DISABLED,
      ProviderRegistrationStatus.ARCHIVED,
    ],
    [ProviderRegistrationStatus.ACTIVE]: [
      ProviderRegistrationStatus.DISABLED,
      ProviderRegistrationStatus.ARCHIVED,
    ],
    [ProviderRegistrationStatus.DISABLED]: [
      ProviderRegistrationStatus.ACTIVE,
      ProviderRegistrationStatus.ARCHIVED,
    ],
    [ProviderRegistrationStatus.ARCHIVED]: [] as ProviderRegistrationStatus[],
  } as Record<ProviderRegistrationStatus, ProviderRegistrationStatus[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    displayName: 'displayName',
    status: 'status',
    priority: 'priority',
    version: 'version',
  } as Record<string, string>,
} as const;
