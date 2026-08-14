import { TaxRuleStatus } from '../interfaces';

export const TAX_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  CACHE_TTL_MS: 300_000, // 5 min — rule sets change rarely
  CALCULATION_CACHE_TTL_MS: 60_000, // 1 min
  CACHE_MAX_ENTRIES: 1_000,
  CALCULATION_CACHE_MAX: 5_000,

  DEFAULT_PRIORITY: 50,
  DEFAULT_CALCULATION_MODE: 'EXCLUSIVE',
  DEFAULT_ROUNDING_DECIMALS: 2, // used only when the target currency isn't registered in the Currency Engine

  ALLOWED_RULE_TRANSITIONS: {
    [TaxRuleStatus.DRAFT]: [TaxRuleStatus.PENDING_APPROVAL, TaxRuleStatus.PUBLISHED, TaxRuleStatus.ARCHIVED],
    [TaxRuleStatus.PENDING_APPROVAL]: [TaxRuleStatus.APPROVED, TaxRuleStatus.ARCHIVED],
    [TaxRuleStatus.APPROVED]: [TaxRuleStatus.PUBLISHED, TaxRuleStatus.ARCHIVED],
    [TaxRuleStatus.PUBLISHED]: [TaxRuleStatus.ARCHIVED],
    [TaxRuleStatus.ARCHIVED]: [] as TaxRuleStatus[],
  } as Record<TaxRuleStatus, TaxRuleStatus[]>,

  MUTABLE_RULE_STATUSES: new Set<TaxRuleStatus>([TaxRuleStatus.DRAFT, TaxRuleStatus.PENDING_APPROVAL]),

  SORT_FIELDS: {
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
    priority: 'priority',
    rate: 'rate',
    effectiveFrom: 'effectiveFrom',
  } as Record<string, string>,
} as const;

export const TAX_ERROR_CODES = {
  JURISDICTION_NOT_FOUND: 'TAX_JURISDICTION_NOT_FOUND',
  JURISDICTION_DUPLICATE: 'TAX_JURISDICTION_DUPLICATE',
  RULE_NOT_FOUND: 'TAX_RULE_NOT_FOUND',
  INVALID_RULE: 'TAX_INVALID_RULE',
  INVALID_TRANSITION: 'TAX_INVALID_TRANSITION',
  IMMUTABLE: 'TAX_RULE_IMMUTABLE',
  NO_APPLICABLE_RULE: 'TAX_NO_APPLICABLE_RULE',
  UNAUTHORIZED_OVERRIDE: 'TAX_UNAUTHORIZED_OVERRIDE',
  HISTORY_VERSION_NOT_FOUND: 'TAX_HISTORY_VERSION_NOT_FOUND',
} as const;

export const TAX_EVENT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 3_000,
  REMOVE_ON_COMPLETE: 50,
  REMOVE_ON_FAIL: 100,
} as const;

export const TAX_MODULE = 'tax';
