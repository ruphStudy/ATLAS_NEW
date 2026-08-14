import { BackupJobStatus, BackupPolicyStatus } from '../interfaces';

export const BACKUP_MANAGEMENT_MODULE = 'backup-management';
export const SYSTEM_ACTOR_ID = 'system';

export const BACKUP_MANAGEMENT_CONSTANTS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  /** How long a concurrency lock is held before it's considered stale and eligible for reclaim. */
  LOCK_TTL_MS: 2 * 60 * 60 * 1000, // 2 hours

  /** Cap on rows scanned per tick when lazily expiring/rotating backup records — mirrors the bounded-scan pattern used across this codebase's scheduler-callable methods. */
  SCAN_LIMIT: 500,

  ALLOWED_POLICY_TRANSITIONS: {
    [BackupPolicyStatus.DRAFT]: [BackupPolicyStatus.ACTIVE, BackupPolicyStatus.ARCHIVED],
    [BackupPolicyStatus.ACTIVE]: [BackupPolicyStatus.PAUSED, BackupPolicyStatus.ARCHIVED],
    [BackupPolicyStatus.PAUSED]: [BackupPolicyStatus.ACTIVE, BackupPolicyStatus.ARCHIVED],
    [BackupPolicyStatus.ARCHIVED]: [BackupPolicyStatus.DRAFT],
  } as Record<BackupPolicyStatus, BackupPolicyStatus[]>,

  ACTIVE_JOB_STATUSES: new Set<BackupJobStatus>([BackupJobStatus.PENDING, BackupJobStatus.RUNNING, BackupJobStatus.VALIDATING]),

  POLICY_SORT_FIELDS: ['createdAt', 'updatedAt', 'environment', 'service'] as const,
  JOB_SORT_FIELDS: ['createdAt', 'startedAt', 'endedAt', 'status'] as const,
  RECORD_SORT_FIELDS: ['capturedAt', 'createdAt', 'expiresAt'] as const,
} as const;
