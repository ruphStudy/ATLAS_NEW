import { AccountStatus } from '../interfaces';

export const MP_ACCOUNT_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  MAX_ACCOUNT_NAME_LENGTH: 200,
  MAX_ACCOUNTS_PER_PROVIDER_WORKSPACE: 50,
  CONNECTION_TEST_TIMEOUT_MS: 20_000,
  SORT_FIELDS: ['accountName', 'priority', 'status', 'createdAt', 'updatedAt'] as const,

  ALLOWED_TRANSITIONS: {
    [AccountStatus.DRAFT]: [AccountStatus.PENDING_VALIDATION, AccountStatus.ARCHIVED],
    [AccountStatus.PENDING_VALIDATION]: [AccountStatus.ACTIVE, AccountStatus.INVALID, AccountStatus.ARCHIVED],
    [AccountStatus.ACTIVE]: [AccountStatus.DISABLED, AccountStatus.SUSPENDED, AccountStatus.EXPIRED, AccountStatus.ARCHIVED],
    [AccountStatus.DISABLED]: [AccountStatus.ACTIVE, AccountStatus.ARCHIVED],
    [AccountStatus.INVALID]: [AccountStatus.PENDING_VALIDATION, AccountStatus.ARCHIVED],
    [AccountStatus.EXPIRED]: [AccountStatus.PENDING_VALIDATION, AccountStatus.ARCHIVED],
    [AccountStatus.SUSPENDED]: [AccountStatus.ACTIVE, AccountStatus.DISABLED, AccountStatus.ARCHIVED],
    [AccountStatus.ARCHIVED]: [AccountStatus.DRAFT],
  } as Record<AccountStatus, AccountStatus[]>,

  MUTABLE_STATUSES: [
    AccountStatus.DRAFT,
    AccountStatus.PENDING_VALIDATION,
    AccountStatus.INVALID,
    AccountStatus.EXPIRED,
    AccountStatus.DISABLED,
    AccountStatus.SUSPENDED,
  ] as AccountStatus[],

  /** Statuses that allow an account to be set as default */
  ACTIVE_STATUSES: [AccountStatus.ACTIVE] as AccountStatus[],
} as const;

export const MP_ACCOUNT_ERROR_CODES = {
  NOT_FOUND: 'ACCOUNT_NOT_FOUND',
  DUPLICATE_EXTERNAL_ACCOUNT: 'ACCOUNT_DUPLICATE_EXTERNAL_ACCOUNT',
  DUPLICATE_DEFAULT: 'ACCOUNT_DUPLICATE_DEFAULT',
  PROVIDER_NOT_REGISTERED: 'ACCOUNT_PROVIDER_NOT_REGISTERED',
  INVALID_TRANSITION: 'ACCOUNT_INVALID_TRANSITION',
  IMMUTABLE_STATUS: 'ACCOUNT_IMMUTABLE_STATUS',
  CONNECTION_TEST_REQUIRED: 'ACCOUNT_CONNECTION_TEST_REQUIRED',
  CONNECTION_TEST_FAILED: 'ACCOUNT_CONNECTION_TEST_FAILED',
  VALIDATION_FAILED: 'ACCOUNT_VALIDATION_FAILED',
  WORKSPACE_ISOLATION: 'ACCOUNT_WORKSPACE_ISOLATION',
  OPTIMISTIC_LOCK: 'ACCOUNT_OPTIMISTIC_LOCK',
} as const;

export const MP_ACCOUNT_QUEUE_CONFIG = {
  ATTEMPTS: 3,
  BACKOFF_MS: 5_000,
  REMOVE_ON_COMPLETE: 200,
  REMOVE_ON_FAIL: 100,
} as const;
