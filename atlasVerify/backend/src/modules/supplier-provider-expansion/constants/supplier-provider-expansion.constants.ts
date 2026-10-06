import { SupplierProviderRolloutState } from '../interfaces';

export const SUPPLIER_PROVIDER_EXPANSION_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  CACHE_TTL_MS: 300_000, // 5 min — expansion configuration changes rarely
  CACHE_MAX_ENTRIES: 1_000,

  /** BETA and ACTIVE both require a COMPATIBLE adapter — DRAFT does not (config can exist before the adapter ships). */
  ROLLOUT_STATES_REQUIRING_COMPATIBLE_ADAPTER: new Set<SupplierProviderRolloutState>([
    SupplierProviderRolloutState.BETA,
    SupplierProviderRolloutState.ACTIVE,
  ]),

  ALLOWED_ROLLOUT_TRANSITIONS: {
    [SupplierProviderRolloutState.DRAFT]: [SupplierProviderRolloutState.BETA, SupplierProviderRolloutState.ACTIVE, SupplierProviderRolloutState.DISABLED],
    [SupplierProviderRolloutState.BETA]: [SupplierProviderRolloutState.ACTIVE, SupplierProviderRolloutState.DRAFT, SupplierProviderRolloutState.DISABLED],
    [SupplierProviderRolloutState.ACTIVE]: [SupplierProviderRolloutState.DEPRECATED, SupplierProviderRolloutState.DISABLED],
    [SupplierProviderRolloutState.DEPRECATED]: [SupplierProviderRolloutState.ACTIVE, SupplierProviderRolloutState.DISABLED],
    [SupplierProviderRolloutState.DISABLED]: [SupplierProviderRolloutState.DRAFT], // re-onboard path only
  } as Record<SupplierProviderRolloutState, SupplierProviderRolloutState[]>,

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    providerCode: 'providerCode',
    rolloutState: 'rolloutState',
  } as Record<string, string>,
} as const;

export const SUPPLIER_PROVIDER_EXPANSION_ERROR_CODES = {
  EXPANSION_NOT_FOUND: 'SUPPLIER_PROVIDER_EXPANSION_NOT_FOUND',
  EXPANSION_DUPLICATE: 'SUPPLIER_PROVIDER_EXPANSION_DUPLICATE',
  INVALID_EXPANSION: 'SUPPLIER_PROVIDER_EXPANSION_INVALID',
  INVALID_TRANSITION: 'SUPPLIER_PROVIDER_EXPANSION_INVALID_TRANSITION',
  ADAPTER_NOT_REGISTERED: 'SUPPLIER_PROVIDER_EXPANSION_ADAPTER_NOT_REGISTERED',
  ADAPTER_INCOMPATIBLE: 'SUPPLIER_PROVIDER_EXPANSION_ADAPTER_INCOMPATIBLE',
  NOT_ELIGIBLE: 'SUPPLIER_PROVIDER_EXPANSION_NOT_ELIGIBLE',
} as const;

export const SUPPLIER_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const SUPPLIER_PROVIDER_EXPANSION_MODULE = 'supplier-provider-expansion';
