// =============================================================
// Disaster Recovery – Core Interfaces & Enums
//
// A recovery plan's runbook IS a `WorkflowDefinition` (Enterprise
// Workflow Engine) — never a second execution engine. Approval gating
// is a plain APPROVAL step in that same runbook, reusing the engine's
// built-in `ApprovalStepExecutor` (Enterprise Approval Engine). Backup
// discovery/restore/integrity checks run through the generic
// `BackupProviderRegistry` — no infrastructure-specific logic lives
// here.
// =============================================================

export enum DrEnvironment {
  PRODUCTION = 'PRODUCTION',
  STAGING = 'STAGING',
  DEVELOPMENT = 'DEVELOPMENT',
}

export enum DrPolicyStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  ARCHIVED = 'ARCHIVED',
}

export enum DrRecoveryScope {
  PARTIAL = 'PARTIAL',
  TENANT = 'TENANT',
  FULL_PLATFORM = 'FULL_PLATFORM',
}

export enum DrPlanStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export enum DrExecutionStatus {
  PENDING = 'PENDING',
  AWAITING_APPROVAL = 'AWAITING_APPROVAL',
  VALIDATING = 'VALIDATING',
  RUNNING = 'RUNNING',
  PAUSED = 'PAUSED',
  ROLLING_BACK = 'ROLLING_BACK',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum DrExecutionTrigger {
  MANUAL = 'MANUAL',
  DETECTED_DISASTER = 'DETECTED_DISASTER',
  SCHEDULED_DRILL = 'SCHEDULED_DRILL',
}

export enum DrCheckpointStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  VALIDATED = 'VALIDATED',
  FAILED = 'FAILED',
  ROLLED_BACK = 'ROLLED_BACK',
  SIMULATED = 'SIMULATED',
}

export enum DrBackupIntegrityStatus {
  UNVALIDATED = 'UNVALIDATED',
  VALID = 'VALID',
  CORRUPT = 'CORRUPT',
}

export enum DrBackupFreshnessStatus {
  FRESH = 'FRESH',
  STALE = 'STALE',
  EXPIRED = 'EXPIRED',
}

export enum DrEvent {
  POLICY_CREATED = 'disaster-recovery.policy_created',
  POLICY_UPDATED = 'disaster-recovery.policy_updated',
  POLICY_ACTIVATED = 'disaster-recovery.policy_activated',
  POLICY_PAUSED = 'disaster-recovery.policy_paused',
  POLICY_ARCHIVED = 'disaster-recovery.policy_archived',
  PLAN_CREATED = 'disaster-recovery.plan_created',
  PLAN_UPDATED = 'disaster-recovery.plan_updated',
  PLAN_PUBLISHED = 'disaster-recovery.plan_published',
  PLAN_ARCHIVED = 'disaster-recovery.plan_archived',
  DISASTER_DETECTED = 'disaster-recovery.disaster_detected',
  RECOVERY_STARTED = 'disaster-recovery.recovery_started',
  RECOVERY_VALIDATION_FAILED = 'disaster-recovery.recovery_validation_failed',
  RECOVERY_CHECKPOINT_REACHED = 'disaster-recovery.recovery_checkpoint_reached',
  RECOVERY_COMPLETED = 'disaster-recovery.recovery_completed',
  RECOVERY_FAILED = 'disaster-recovery.recovery_failed',
  RECOVERY_CANCELLED = 'disaster-recovery.recovery_cancelled',
  RECOVERY_ROLLED_BACK = 'disaster-recovery.recovery_rolled_back',
  BACKUP_DISCOVERED = 'disaster-recovery.backup_discovered',
}

// ── Core entities ─────────────────────────────────────────────

export interface IDrPolicy {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  environment: DrEnvironment;
  criticalService: string;
  rpoMinutes: number;
  rtoMinutes: number;
  recoveryPriority: number;
  coverageTargets: string[];
  dependencyOrder: string[];
  regionFailoverConfig?: Record<string, unknown> | null;
  autoTriggerOnDetection: boolean;
  version: number;
  status: DrPolicyStatus;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IDrPolicyHistory {
  id: string;
  policyId: string;
  version: number;
  status: DrPolicyStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IDrRecoveryPlan {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  policyId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  scope: DrRecoveryScope;
  targets: string[];
  workflowDefinitionId: string;
  requiresApproval: boolean;
  approvalDefinitionKey?: string | null;
  isTemplate: boolean;
  dryRunDefault: boolean;
  version: number;
  status: DrPlanStatus;
  metadata: Record<string, unknown>;
  createdBy?: string | null;
  updatedBy?: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface IDrRecoveryPlanHistory {
  id: string;
  planId: string;
  version: number;
  status: DrPlanStatus;
  snapshot: Record<string, unknown>;
  changeReason?: string | null;
  changedBy?: string | null;
  createdAt: Date;
}

export interface IDrRecoveryExecution {
  id: string;
  workspaceId?: string | null;
  organizationId?: string | null;
  planId: string;
  policyId?: string | null;
  scope: DrRecoveryScope;
  status: DrExecutionStatus;
  isDryRun: boolean;
  triggerType: DrExecutionTrigger;
  triggeredBy?: string | null;
  targetWorkspaceIds: string[];
  approvalRequestId?: string | null;
  workflowExecutionId?: string | null;
  idempotencyKey?: string | null;
  currentCheckpointSequence: number;
  rpoActualMinutes?: number | null;
  rtoActualMinutes?: number | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  rollbackOfExecutionId?: string | null;
  metadata: Record<string, unknown>;
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDrRecoveryCheckpoint {
  id: string;
  executionId: string;
  workspaceId?: string | null;
  sequence: number;
  targetType: string;
  status: DrCheckpointStatus;
  backupRecordId?: string | null;
  freshnessCheckedAt?: Date | null;
  integrityCheckedAt?: Date | null;
  notes?: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDrBackupRecord {
  id: string;
  workspaceId?: string | null;
  targetType: string;
  providerKey: string;
  externalRef: string;
  capturedAt: Date;
  discoveredAt: Date;
  sizeBytes?: bigint | null;
  checksum?: string | null;
  integrityStatus: DrBackupIntegrityStatus;
  freshnessStatus: DrBackupFreshnessStatus;
  restoreEligible: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface IDrRecoveryLock {
  id: string;
  scopeKey: string;
  executionId: string;
  acquiredAt: Date;
  expiresAt: Date;
}

// ── Validation ────────────────────────────────────────────────

export interface IDrValidationIssue {
  field: string;
  message: string;
}

export interface IDrValidationResult {
  valid: boolean;
  issues: IDrValidationIssue[];
  warnings: string[];
}

export interface IDrBackupEligibilityResult {
  eligible: boolean;
  targetType: string;
  reason?: string;
  backupRecordId?: string;
  providerKey?: string;
  externalRef?: string;
}

// ── Filters ───────────────────────────────────────────────────

export interface IDrPolicyFilterOptions {
  workspaceId?: string | null;
  organizationId?: string | null;
  environment?: DrEnvironment;
  status?: DrPolicyStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IDrPlanFilterOptions {
  workspaceId?: string | null;
  policyId?: string;
  scope?: DrRecoveryScope;
  status?: DrPlanStatus;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface IDrExecutionFilterOptions {
  workspaceId?: string | null;
  planId?: string;
  status?: DrExecutionStatus;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// ── Event payload ─────────────────────────────────────────────

export interface IDrEventPayload {
  event: DrEvent;
  workspaceId?: string | null;
  policyId?: string;
  planId?: string;
  executionId?: string;
  checkpointId?: string;
  status?: string;
  performedBy?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}
