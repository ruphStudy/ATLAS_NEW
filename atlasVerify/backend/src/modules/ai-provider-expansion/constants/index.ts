import { AiProviderRolloutState } from '../interfaces';

export const AI_PROVIDER_EXPANSION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — rollout/eligibility configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  /** BETA and ACTIVE both require a COMPATIBLE adapter — DRAFT does not (config can exist before the adapter ships). */
  ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER: new Set<AiProviderRolloutState>([
    AiProviderRolloutState.BETA,
    AiProviderRolloutState.ACTIVE,
  ]),

  ALLOWED_ROLLOUT_TRANSITIONS: {
    [AiProviderRolloutState.DRAFT]: [AiProviderRolloutState.BETA, AiProviderRolloutState.ACTIVE, AiProviderRolloutState.DISABLED],
    [AiProviderRolloutState.BETA]: [AiProviderRolloutState.ACTIVE, AiProviderRolloutState.DRAFT, AiProviderRolloutState.DISABLED],
    [AiProviderRolloutState.ACTIVE]: [AiProviderRolloutState.DEPRECATED, AiProviderRolloutState.DISABLED],
    [AiProviderRolloutState.DEPRECATED]: [AiProviderRolloutState.ACTIVE, AiProviderRolloutState.DISABLED],
    [AiProviderRolloutState.DISABLED]: [AiProviderRolloutState.DRAFT], // re-onboard path only
  } as Record<AiProviderRolloutState, AiProviderRolloutState[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    rolloutState: 'rolloutState',
  } as Record<string, string>,
} as const;
