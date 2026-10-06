import { MarketplaceRolloutState } from '../interfaces';

export const MARKETPLACE_EXPANSION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — expansion configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  /** BETA and ACTIVE both require a COMPATIBLE adapter — DRAFT does not (config can exist before the adapter ships). */
  ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER: new Set<MarketplaceRolloutState>([
    MarketplaceRolloutState.BETA,
    MarketplaceRolloutState.ACTIVE,
  ]),

  ALLOWED_ROLLOUT_TRANSITIONS: {
    [MarketplaceRolloutState.DRAFT]: [MarketplaceRolloutState.BETA, MarketplaceRolloutState.ACTIVE, MarketplaceRolloutState.DISABLED],
    [MarketplaceRolloutState.BETA]: [MarketplaceRolloutState.ACTIVE, MarketplaceRolloutState.DRAFT, MarketplaceRolloutState.DISABLED],
    [MarketplaceRolloutState.ACTIVE]: [MarketplaceRolloutState.DEPRECATED, MarketplaceRolloutState.DISABLED],
    [MarketplaceRolloutState.DEPRECATED]: [MarketplaceRolloutState.ACTIVE, MarketplaceRolloutState.DISABLED],
    [MarketplaceRolloutState.DISABLED]: [MarketplaceRolloutState.DRAFT], // re-onboard path only
  } as Record<MarketplaceRolloutState, MarketplaceRolloutState[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    rolloutState: 'rolloutState',
  } as Record<string, string>,
} as const;

export const MARKETPLACE_EXPANSION_ERROR_CODES = {
  EXPANSION_NOT_FOUND: 'MARKETPLACE_EXPANSION_NOT_FOUND',
  EXPANSION_DUPLICATE: 'MARKETPLACE_EXPANSION_DUPLICATE',
  INVALID_EXPANSION: 'MARKETPLACE_EXPANSION_INVALID',
  INVALID_TRANSITION: 'MARKETPLACE_EXPANSION_INVALID_TRANSITION',
  ADAPTER_NOT_REGISTERED: 'MARKETPLACE_EXPANSION_ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE: 'MARKETPLACE_EXPANSION_ADAPTER_INCOMPATIBLE',
  NOT_ELIGIBLE: 'MARKETPLACE_EXPANSION_NOT_ELIGIBLE',
} as const;

export const MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const MARKETPLACE_EXPANSION_MODULE = 'marketplace-expansion';
