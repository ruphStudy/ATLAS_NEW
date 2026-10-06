// =============================================================
// Backup Management – Core Interfaces & Enums
//
// Owns backup CREATION and lifecycle (policies, jobs, retention/
// rotation/expiration). Discovery/validation/restore of already-
// existing backups stays owned by Disaster Recovery; the two modules
// interoperate only through the shared `BackupProviderRegistry`/
// `IBackupProviderAdapter` foundation — never a direct dependency
// between these two business modules.
// =============================================================

export enum BackupPolicyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum BackupScope {
  TENANT = 'TENANT',
  SERVICE = 'SERVICE',
  FULL_PLATFORM = 'FULL_PLATFORM',
}

export enum BackupJobStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  VALIDATING = 'VALIDATING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum BackupTriggerType {
  MANUAL = 'MANUAL',
  SCHEDULED = 'SCHEDULED',
  EVENT = 'EVENT',
}

export enum BackupRecordStatus {
  CREATING = 'CREATING',
  AVAILABLE = 'AVAILABLE',
  VERIFYING = 'VERIFYING',
  VERIFIED = 'VERIFIED',
  CORRUPT = 'CORRUPT',
  EXPIRED = 'EXPIRED',
  DELETED = 'DELETED',
}

export enum BackupIntegrityStatus {
  UNVALIDATED = 'UNVALIDATED',
  VALID = 'VALID',
  CORRUPT = 'CORRUPT',
}

export enum BackupManagementEvent {
  POLICY_CREATED = 'backup-management.policy_created',
  POLICY_UPDATED = 'backup-management.policy_updated',
  POLICY_ACTIVATED = 'backup-management.policy_activated',
  POLICY_PAUSED = 'backup-management.policy_paused',
  POLICY_ARCHIVED = 'backup-management.policy_archived',
  BACKUP_STARTED = 'backup-management.backup_started',
  BACKUP_COMPLETED = 'backup-management.backup_completed',
  BACKUP_FAILED = 'backup-management.backup_failed',
  BACKUP_EXPIRED = 'backup-management.backup_expired',
  BACKUP_VERIFIED = 'backup-management.backup_verified',
  BACKUP_ROTATED = 'backup-management.backup_rotated',
}

// ── Core entities ─────────────────────────────────────────────

export interface IBackupPolicy {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment: string;
  service: string;
  dataType: string;
  backupType: string;
  scope: BackupScope;
  frequencyMinutes?: number | null;
  cronExpression?: string | null;
  retentionDays: number;
  maxVersions?: number | null;
  encryptionEnabled: boolean;
  encryptionAlgorithm?: string | null;
  compressionEnabled: boolean;
  compressionAlgorithm?: string | null;
  preferredProviderKey?: string | null;
  version: number;
  status: BackupPolicyStatus;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IBackupPolicyHistory {
  id: string;
  policyId: string;
  version: number;
  status: BackupPolicyStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IBackupJob {
  id: string;
  policyId: string;
  workspaceId?: string | null;
  triggerType: BackupTriggerType;
  triggeredBy?: string | null;
  scope: BackupScope;
  targetType: string;
  backupType: string;
  status: BackupJobStatus;
  idempotencyKey?: string | null;
  retryCount: number;
  maxRetries: number;
  backupRecordId?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  metadata: Record<string, unknown>;
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBackupRecord {
  id: string;
  workspaceId?: string | null;
  policyId?: string | null;
  jobId?: string | null;
  targetType: string;
  backupType: string;
  providerKey: string;
  externalRef: string;
  storageProviderKey?: string | null;
  storageReference?: string | null;
  sizeBytes?: bigint | null;
  checksum?: string | null;
  version: number;
  status: BackupRecordStatus;
  encryptionEnabled: boolean;
  compressionEnabled: boolean;
  integrityStatus: BackupIntegrityStatus;
  restorable: boolean;
  capturedAt: Date;
  verifiedAt?: Date | null;
  expiresAt?: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IBackupLock {
  id: string;
  scopeKey: string;
  jobId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface IBackupValidationIssue {
  field: string;
  message: string;
}

export interface IBackupValidationResult {
  valid: boolean;
  issues: IBackupValidationIssue[];
  warnings: string[];
}

// ── Filters ───────────────────────────────────────────────────

export interface IBackupPolicyFilterOptions {
  workspaceId?: string | null;
  organizationId?: string | null;
  environment?: string;
  status?: BackupPolicyStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IBackupJobFilterOptions {
  workspaceId?: string | null;
  policyId?: string;
  status?: BackupJobStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IBackupRecordFilterOptions {
  workspaceId?: string | null;
  policyId?: string;
  targetType?: string;
  status?: BackupRecordStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Event payload ─────────────────────────────────────────────

export interface IBackupManagementEventPayload {
  event: BackupManagementEvent;
  workspaceId?: string | null;
  policyId?: string;
  jobId?: string;
  backupRecordId?: string;
  status?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
