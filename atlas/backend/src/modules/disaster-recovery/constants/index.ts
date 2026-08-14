import { DrExecutionStatus, DrPlanStatus, DrPolicyStatus } from '../interfaces';

export const DISASTER_RECOVERY_MODULE = 'disaster-recovery';
export const SYSTEM_ACTOR_ID = 'system';

export const DISASTER_RECOVERY_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  /** How long a concurrency lock is held before it's considered stale and eligible for reclaim (guards against a crashed execution holding a lock forever). */
  LOCK_TTL_MS: 4 * 60 * 60 * 1000, // 4 hours

  FULL_PLATFORM_LOCK_SCOPE_KEY: 'full-platform',

  ALLOWED_POLICY_TRANSITIONS: {
    [DrPolicyStatus.DRAFT]: [DrPolicyStatus.ACTIVE, DrPolicyStatus.ARCHIVED],
    [DrPolicyStatus.ACTIVE]: [DrPolicyStatus.PAUSED, DrPolicyStatus.ARCHIVED],
    [DrPolicyStatus.PAUSED]: [DrPolicyStatus.ACTIVE, DrPolicyStatus.ARCHIVED],
    [DrPolicyStatus.ARCHIVED]: [DrPolicyStatus.DRAFT],
  } as Record<DrPolicyStatus, DrPolicyStatus[]>,

  ALLOWED_PLAN_TRANSITIONS: {
    [DrPlanStatus.DRAFT]: [DrPlanStatus.PUBLISHED, DrPlanStatus.ARCHIVED],
    [DrPlanStatus.PUBLISHED]: [DrPlanStatus.ARCHIVED],
    [DrPlanStatus.ARCHIVED]: [DrPlanStatus.DRAFT],
  } as Record<DrPlanStatus, DrPlanStatus[]>,

  ACTIVE_EXECUTION_STATUSES: new Set<DrExecutionStatus>([
    DrExecutionStatus.PENDING,
    DrExecutionStatus.AWAITING_APPROVAL,
    DrExecutionStatus.VALIDATING,
    DrExecutionStatus.RUNNING,
    DrExecutionStatus.PAUSED,
    DrExecutionStatus.ROLLING_BACK,
  ]),

  POLICY_SORT_FIELDS: ['createdAt', 'updatedAt', 'recoveryPriority', 'environment'] as const,
  PLAN_SORT_FIELDS: ['createdAt', 'updatedAt', 'name', 'key'] as const,
  EXECUTION_SORT_FIELDS: ['createdAt', 'startedAt', 'endedAt', 'status'] as const,
} as const;
