import { ShippingProviderRolloutState } from '../interfaces';

export const SHIPPING_PROVIDER_EXPANSION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — expansion configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  /** BETA and ACTIVE both require a COMPATIBLE adapter — DRAFT does not (config can exist before the adapter ships). */
  ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER: new Set<ShippingProviderRolloutState>([
    ShippingProviderRolloutState.BETA,
    ShippingProviderRolloutState.ACTIVE,
  ]),

  ALLOWED_ROLLOUT_TRANSITIONS: {
    [ShippingProviderRolloutState.DRAFT]: [ShippingProviderRolloutState.BETA, ShippingProviderRolloutState.ACTIVE, ShippingProviderRolloutState.DISABLED],
    [ShippingProviderRolloutState.BETA]: [ShippingProviderRolloutState.ACTIVE, ShippingProviderRolloutState.DRAFT, ShippingProviderRolloutState.DISABLED],
    [ShippingProviderRolloutState.ACTIVE]: [ShippingProviderRolloutState.DEPRECATED, ShippingProviderRolloutState.DISABLED],
    [ShippingProviderRolloutState.DEPRECATED]: [ShippingProviderRolloutState.ACTIVE, ShippingProviderRolloutState.DISABLED],
    [ShippingProviderRolloutState.DISABLED]: [ShippingProviderRolloutState.DRAFT], // re-onboard path only
  } as Record<ShippingProviderRolloutState, ShippingProviderRolloutState[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerKey: 'providerKey',
    rolloutState: 'rolloutState',
  } as Record<string, string>,
} as const;

export const SHIPPING_PROVIDER_EXPANSION_ERROR_CODES = {
  EXPANSION_NOT_FOUND: 'SHIPPING_PROVIDER_EXPANSION_NOT_FOUND',
  EXPANSION_DUPLICATE: 'SHIPPING_PROVIDER_EXPANSION_DUPLICATE',
  INVALID_EXPANSION: 'SHIPPING_PROVIDER_EXPANSION_INVALID',
  INVALID_TRANSITION: 'SHIPPING_PROVIDER_EXPANSION_INVALID_TRANSITION',
  ADAPTER_NOT_REGISTERED: 'SHIPPING_PROVIDER_EXPANSION_ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE: 'SHIPPING_PROVIDER_EXPANSION_ADAPTER_INCOMPATIBLE',
  NOT_ELIGIBLE: 'SHIPPING_PROVIDER_EXPANSION_NOT_ELIGIBLE',
} as const;

export const SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const SHIPPING_PROVIDER_EXPANSION_MODULE = 'shipping-provider-expansion';
