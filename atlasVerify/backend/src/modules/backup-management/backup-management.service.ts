import { Injectable, Logger } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { BackupTargetType, BackupType } from '@modules/backup-provider/interfaces';
import { BackupManagementRepository } from './backup-management.repository';
import { BackupManagementValidator } from './validator/backup-management.validator';
import { BackupManagementAudit } from './audit/backup-management.audit';
import { BackupLockService } from './lock/backup-lock.service';
import { BackupManagementEventQueue } from './jobs';
import {
  BackupManagementEvent,
  BackupJobStatus,
  BackupPolicyStatus,
  BackupRecordStatus,
  BackupScope,
  BackupTriggerType,
  BackupIntegrityStatus,
  IBackupPolicy,
  IBackupRecord,
  IBackupPolicyFilterOptions,
  IBackupJobFilterOptions,
  IBackupRecordFilterOptions,
} from './interfaces';
import { BACKUP_MANAGEMENT_CONSTANTS, BACKUP_MANAGEMENT_MODULE, SYSTEM_ACTOR_ID } from './constants';
import {
  BackupJobNotFoundException,
  BackupPolicyAlreadyExistsException,
  BackupPolicyInvalidDefinitionException,
  BackupPolicyInvalidStateTransitionException,
  BackupPolicyNotFoundException,
  BackupProviderNotRegisteredException,
  BackupRecordNotFoundException,
} from './exceptions/backup-management.exceptions';
import {
  BackupEventTriggerDto,
  BackupJobFilterDto,
  BackupJobResponseDto,
  BackupPolicyFilterDto,
  BackupPolicyHistoryResponseDto,
  BackupPolicyResponseDto,
  BackupRecordFilterDto,
  BackupRecordResponseDto,
  CreateBackupPolicyDto,
  PaginatedBackupJobResponseDto,
  PaginatedBackupPolicyResponseDto,
  PaginatedBackupRecordResponseDto,
  TriggerBackupDto,
  UpdateBackupPolicyDto,
} from './dto';

@Injectable()
export class BackupManagementService {
  private readonly logger = new Logger(BackupManagementService.name);

  constructor(
    private readonly repository: BackupManagementRepository,
    private readonly validator: BackupManagementValidator,
    private readonly audit: BackupManagementAudit,
    private readonly lockService: BackupLockService,
    private readonly eventQueue: BackupManagementEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ── Policies ──────────────────────────────────────────────────

  async createPolicy(workspaceId: string, userId: string, userRole: string, dto: CreateBackupPolicyDto): Promise<BackupPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_policy', PermissionAction.CREATE);

    const effectiveWorkspaceId = dto.isGlobal ? null : workspaceId;
    const existing = await this.repository.findActivePolicy(effectiveWorkspaceId, dto.service, dto.dataType);
    if (existing) {
      throw new BackupPolicyAlreadyExistsException(dto.service, dto.dataType);
    }

    const validation = this.validator.validatePolicy(dto.dataType, dto.backupType);
    if (!validation.valid) {
      throw new BackupPolicyInvalidDefinitionException(validation.issues.map((i) => i.message));
    }

    const policy = await this.repository.createPolicy({
      workspaceId: effectiveWorkspaceId,
      organizationId: dto.organizationId ?? null,
      environment: dto.environment,
      service: dto.service,
      dataType: dto.dataType,
      backupType: dto.backupType,
      scope: dto.scope ?? BackupScope.SERVICE,
      frequencyMinutes: dto.frequencyMinutes ?? null,
      cronExpression: dto.cronExpression ?? null,
      retentionDays: dto.retentionDays ?? 30,
      maxVersions: dto.maxVersions ?? null,
      encryptionEnabled: dto.encryptionEnabled ?? true,
      encryptionAlgorithm: dto.encryptionAlgorithm ?? null,
      compressionEnabled: dto.compressionEnabled ?? true,
      compressionAlgorithm: dto.compressionAlgorithm ?? null,
      preferredProviderKey: dto.preferredProviderKey ?? null,
      version: 1,
      status: BackupPolicyStatus.DRAFT,
      metadata: dto.metadata ?? {},
      createdBy: userId,
      updatedBy: userId,
    });

    await this.audit.logPolicyChange(policy, 'Created', userId);
    await this.publishEvent(BackupManagementEvent.POLICY_CREATED, { workspaceId, policyId: policy.id, performedBy: userId });
    await this.recordCentralAudit('backup_management.policy.created', workspaceId, userId, { service: policy.service, dataType: policy.dataType });
    return BackupPolicyResponseDto.from(policy as unknown as Record<string, unknown>);
  }

  async updatePolicy(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateBackupPolicyDto): Promise<BackupPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_policy', PermissionAction.UPDATE);
    const existing = await this.requirePolicy(id, workspaceId);

    const raw = await this.repository.updatePolicy(id, {
      ...(dto.frequencyMinutes !== undefined && { frequencyMinutes: dto.frequencyMinutes }),
      ...(dto.cronExpression !== undefined && { cronExpression: dto.cronExpression }),
      ...(dto.retentionDays !== undefined && { retentionDays: dto.retentionDays }),
      ...(dto.maxVersions !== undefined && { maxVersions: dto.maxVersions }),
      ...(dto.encryptionEnabled !== undefined && { encryptionEnabled: dto.encryptionEnabled }),
      ...(dto.encryptionAlgorithm !== undefined && { encryptionAlgorithm: dto.encryptionAlgorithm }),
      ...(dto.compressionEnabled !== undefined && { compressionEnabled: dto.compressionEnabled }),
      ...(dto.compressionAlgorithm !== undefined && { compressionAlgorithm: dto.compressionAlgorithm }),
      ...(dto.preferredProviderKey !== undefined && { preferredProviderKey: dto.preferredProviderKey }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      version: existing.version + 1,
      updatedBy: userId,
    });

    await this.audit.logPolicyChange(raw, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(BackupManagementEvent.POLICY_UPDATED, { workspaceId, policyId: id, performedBy: userId });
    return BackupPolicyResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async activatePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<BackupPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, BackupPolicyStatus.ACTIVE, BackupManagementEvent.POLICY_ACTIVATED, 'Activated');
  }

  async pausePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<BackupPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, BackupPolicyStatus.PAUSED, BackupManagementEvent.POLICY_PAUSED, 'Paused');
  }

  async archivePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<BackupPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, BackupPolicyStatus.ARCHIVED, BackupManagementEvent.POLICY_ARCHIVED, 'Archived');
  }

  async restorePolicy(id: string, workspaceId: string, userId: string, userRole: string): Promise<BackupPolicyResponseDto> {
    return this.transitionPolicy(id, workspaceId, userId, userRole, BackupPolicyStatus.DRAFT, BackupManagementEvent.POLICY_UPDATED, 'Restored');
  }

  private async transitionPolicy(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: BackupPolicyStatus,
    event: BackupManagementEvent,
    reason: string,
  ): Promise<BackupPolicyResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_policy', PermissionAction.UPDATE);
    const existing = await this.requirePolicy(id, workspaceId);
    const allowed = BACKUP_MANAGEMENT_CONSTANTS.ALLOWED_POLICY_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new BackupPolicyInvalidStateTransitionException(existing.status, to);
    }
    const raw = await this.repository.updatePolicy(id, { status: to, updatedBy: userId });
    await this.audit.logPolicyChange(raw, reason, userId);
    await this.publishEvent(event, { workspaceId, policyId: id, performedBy: userId });
    return BackupPolicyResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async findPolicyById(id: string, workspaceId?: string): Promise<BackupPolicyResponseDto> {
    return BackupPolicyResponseDto.from((await this.requirePolicy(id, workspaceId)) as unknown as Record<string, unknown>);
  }

  async findPolicies(workspaceId: string, filter: BackupPolicyFilterDto): Promise<PaginatedBackupPolicyResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findPolicies({ ...filter, workspaceId } as IBackupPolicyFilterOptions);
    return PaginatedBackupPolicyResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  async getPolicyHistory(id: string, workspaceId?: string): Promise<BackupPolicyHistoryResponseDto[]> {
    await this.requirePolicy(id, workspaceId);
    const raws = await this.repository.findPolicyHistory(id);
    return raws.map((r) => BackupPolicyHistoryResponseDto.from(r as unknown as Record<string, unknown>));
  }

  // ── Backup execution ──────────────────────────────────────────

  async triggerBackup(workspaceId: string, userId: string, userRole: string, policyId: string, dto: TriggerBackupDto): Promise<BackupJobResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_job', PermissionAction.CREATE);
    const policy = await this.requirePolicy(policyId, workspaceId);
    if (policy.status !== BackupPolicyStatus.ACTIVE) {
      throw new BackupPolicyInvalidStateTransitionException(policy.status, 'trigger a backup for');
    }

    if (policy.scope === BackupScope.TENANT) {
      const targetWorkspaceId = dto.targetWorkspaceIds?.[0] ?? workspaceId;
      await this.validator.assertTenantBoundary(targetWorkspaceId);
    }
    if (policy.scope === BackupScope.FULL_PLATFORM) {
      await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_full_platform', PermissionAction.ADMIN);
    }

    return this.runBackup(policy, {
      triggerType: BackupTriggerType.MANUAL,
      triggeredBy: userId ?? SYSTEM_ACTOR_ID,
      workspaceId: policy.scope === BackupScope.FULL_PLATFORM ? null : (dto.targetWorkspaceIds?.[0] ?? workspaceId),
      idempotencyKey: dto.idempotencyKey,
      reason: dto.reason,
    });
  }

  async handleTriggerEvent(dto: BackupEventTriggerDto): Promise<BackupJobResponseDto> {
    const policy = await this.requirePolicy(dto.policyId);
    if (policy.status !== BackupPolicyStatus.ACTIVE) {
      throw new BackupPolicyInvalidStateTransitionException(policy.status, 'trigger a backup for');
    }
    return this.runBackup(policy, {
      triggerType: BackupTriggerType.EVENT,
      triggeredBy: SYSTEM_ACTOR_ID,
      workspaceId: policy.workspaceId ?? null,
      reason: dto.reason,
    });
  }

  /** Scheduler-callable (no active cron wired — mirrors `processSlaAndEscalations`/`processDueScheduledRules` elsewhere in this codebase). */
  async processDueScheduledBackups(): Promise<{ triggeredCount: number }> {
    const policies = await this.repository.findSchedulablePolicies();
    let triggeredCount = 0;

    for (const policy of policies) {
      const [recentJobs] = await this.repository.findJobs({ policyId: policy.id, page: 1, limit: 1, sortBy: 'startedAt', sortOrder: 'desc' });
      const lastJob = recentJobs[0];
      const dueAt = lastJob ? new Date(lastJob.startedAt.getTime() + (policy.frequencyMinutes ?? 0) * 60_000) : new Date(0);
      if (dueAt > new Date()) continue;

      try {
        await this.runBackup(policy, { triggerType: BackupTriggerType.SCHEDULED, triggeredBy: SYSTEM_ACTOR_ID, workspaceId: policy.workspaceId ?? null });
        triggeredCount++;
      } catch (err) {
        this.logger.warn(`Scheduled backup failed to start for policy '${policy.id}': ${(err as Error).message}`);
      }
    }

    return { triggeredCount };
  }

  private async runBackup(
    policy: IBackupPolicy,
    trigger: { triggerType: BackupTriggerType; triggeredBy?: string; workspaceId: string | null; idempotencyKey?: string; reason?: string },
  ): Promise<BackupJobResponseDto> {
    if (trigger.idempotencyKey) {
      const existingJob = await this.repository.findJobByIdempotencyKey(policy.id, trigger.idempotencyKey);
      if (existingJob) {
        return BackupJobResponseDto.from(existingJob as unknown as Record<string, unknown>);
      }
    }

    const scopeKey = this.lockService.buildScopeKey({
      scope: policy.scope,
      workspaceId: trigger.workspaceId ?? undefined,
      service: policy.service,
      dataType: policy.dataType,
    });

    let job = await this.repository.createJob({
      policyId: policy.id,
      workspaceId: trigger.workspaceId,
      triggerType: trigger.triggerType,
      triggeredBy: trigger.triggeredBy ?? SYSTEM_ACTOR_ID,
      scope: policy.scope,
      targetType: policy.dataType,
      backupType: policy.backupType,
      status: BackupJobStatus.PENDING,
      idempotencyKey: trigger.idempotencyKey ?? null,
      retryCount: 0,
      maxRetries: 3,
      metadata: { reason: trigger.reason ?? null },
    });

    await this.lockService.acquire(scopeKey, job.id);

    try {
      job = await this.repository.updateJob(job.id, { status: BackupJobStatus.RUNNING });
      await this.publishEvent(BackupManagementEvent.BACKUP_STARTED, { workspaceId: trigger.workspaceId, policyId: policy.id, jobId: job.id, performedBy: trigger.triggeredBy });
      await this.recordCentralAudit('backup_management.backup.started', trigger.workspaceId ?? 'platform', trigger.triggeredBy, { policyId: policy.id });

      const provider = this.validator.resolveProvider(policy.dataType, policy.preferredProviderKey);
      if (!provider || typeof provider.createBackup !== 'function') {
        throw new BackupProviderNotRegisteredException(policy.dataType);
      }

      const result = await provider.createBackup(policy.dataType as BackupTargetType, trigger.workspaceId ?? undefined, {
        backupType: policy.backupType as BackupType,
        encryption: { enabled: policy.encryptionEnabled, algorithm: policy.encryptionAlgorithm ?? undefined },
        compression: { enabled: policy.compressionEnabled, algorithm: policy.compressionAlgorithm ?? undefined },
        metadata: { policyId: policy.id, jobId: job.id },
      });

      if (!result.success || !result.descriptor) {
        job = await this.repository.updateJob(job.id, {
          status: BackupJobStatus.FAILED,
          errorCode: 'BACKUP_CREATION_FAILED',
          errorMessage: result.message ?? 'Backup provider reported failure',
          endedAt: new Date(),
        });
        await this.lockService.release(scopeKey);
        await this.publishEvent(BackupManagementEvent.BACKUP_FAILED, { workspaceId: trigger.workspaceId, policyId: policy.id, jobId: job.id, performedBy: trigger.triggeredBy });
        return BackupJobResponseDto.from(job as unknown as Record<string, unknown>);
      }

      const expiresAt = new Date(Date.now() + policy.retentionDays * 24 * 60 * 60 * 1000);
      const record = await this.repository.createRecord({
        workspaceId: trigger.workspaceId,
        policyId: policy.id,
        jobId: job.id,
        targetType: policy.dataType,
        backupType: policy.backupType,
        providerKey: result.descriptor.providerKey,
        externalRef: result.descriptor.externalRef,
        sizeBytes: result.descriptor.sizeBytes ? BigInt(Math.trunc(result.descriptor.sizeBytes)) : null,
        checksum: result.descriptor.checksum ?? null,
        version: 1,
        status: BackupRecordStatus.AVAILABLE,
        encryptionEnabled: policy.encryptionEnabled,
        compressionEnabled: policy.compressionEnabled,
        integrityStatus: BackupIntegrityStatus.UNVALIDATED,
        restorable: true,
        capturedAt: result.descriptor.capturedAt,
        expiresAt,
        metadata: result.descriptor.metadata ?? {},
      });

      job = await this.repository.updateJob(job.id, { status: BackupJobStatus.COMPLETED, backupRecordId: record.id, endedAt: new Date() });
      await this.lockService.release(scopeKey);

      await this.recordCentralAudit('backup_management.backup.completed', trigger.workspaceId ?? 'platform', trigger.triggeredBy, { policyId: policy.id, backupRecordId: record.id });
      await this.publishEvent(BackupManagementEvent.BACKUP_COMPLETED, { workspaceId: trigger.workspaceId, policyId: policy.id, jobId: job.id, backupRecordId: record.id, performedBy: trigger.triggeredBy });

      await this.applyRotation(policy);

      return BackupJobResponseDto.from(job as unknown as Record<string, unknown>);
    } catch (err) {
      job = await this.repository.updateJob(job.id, {
        status: BackupJobStatus.FAILED,
        errorCode: 'BACKUP_ERROR',
        errorMessage: (err as Error).message,
        endedAt: new Date(),
      });
      await this.lockService.release(scopeKey);
      await this.publishEvent(BackupManagementEvent.BACKUP_FAILED, { workspaceId: trigger.workspaceId, policyId: policy.id, jobId: job.id, performedBy: trigger.triggeredBy });
      throw err;
    }
  }

  async verifyBackup(id: string, workspaceId: string, userId: string, userRole: string): Promise<BackupRecordResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'backup_record', PermissionAction.UPDATE);
    const record = await this.requireRecord(id);

    const updatedToVerifying = await this.repository.updateRecord(id, { status: BackupRecordStatus.VERIFYING });
    const result = await this.validator.validateIntegrity({
      providerKey: updatedToVerifying.providerKey,
      targetType: updatedToVerifying.targetType as BackupTargetType,
      externalRef: updatedToVerifying.externalRef,
      capturedAt: updatedToVerifying.capturedAt,
      sizeBytes: updatedToVerifying.sizeBytes ? Number(updatedToVerifying.sizeBytes) : undefined,
      checksum: updatedToVerifying.checksum ?? undefined,
    });

    const raw = await this.repository.updateRecord(id, {
      status: result.valid ? BackupRecordStatus.VERIFIED : BackupRecordStatus.CORRUPT,
      integrityStatus: result.valid ? BackupIntegrityStatus.VALID : BackupIntegrityStatus.CORRUPT,
      restorable: result.valid,
      verifiedAt: new Date(),
    });

    await this.recordCentralAudit('backup_management.backup.verified', workspaceId, userId, { backupRecordId: id, valid: result.valid });
    await this.publishEvent(BackupManagementEvent.BACKUP_VERIFIED, { workspaceId, backupRecordId: id, performedBy: userId, metadata: { valid: result.valid, message: result.message } });
    return BackupRecordResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  private async applyRotation(policy: IBackupPolicy): Promise<void> {
    if (!policy.maxVersions) return;
    const excess = await this.repository.findExcessVersions(policy.id, policy.maxVersions);
    for (const record of excess) {
      await this.repository.updateRecord(record.id, { status: BackupRecordStatus.EXPIRED, restorable: false });
      await this.publishEvent(BackupManagementEvent.BACKUP_ROTATED, { workspaceId: record.workspaceId, policyId: policy.id, backupRecordId: record.id });
    }
  }

  /** Scheduler-callable — expires backups past their retention window. */
  async processExpirationAndCleanup(): Promise<{ expiredCount: number }> {
    const now = new Date();
    const expired = await this.repository.findRecordsPastExpiry(now);
    for (const record of expired) {
      await this.repository.updateRecord(record.id, { status: BackupRecordStatus.EXPIRED, restorable: false });
      await this.publishEvent(BackupManagementEvent.BACKUP_EXPIRED, { workspaceId: record.workspaceId, policyId: record.policyId ?? undefined, backupRecordId: record.id });
    }
    return { expiredCount: expired.length };
  }

  // ── Reads / exposure to Disaster Recovery (or any caller) ────────

  async getJobById(id: string): Promise<BackupJobResponseDto> {
    const job = await this.repository.findJobById(id);
    if (!job) throw new BackupJobNotFoundException(id);
    return BackupJobResponseDto.from(job as unknown as Record<string, unknown>);
  }

  async findJobs(workspaceId: string, filter: BackupJobFilterDto): Promise<PaginatedBackupJobResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findJobs({ ...filter, workspaceId } as IBackupJobFilterOptions);
    return PaginatedBackupJobResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  async getRecordById(id: string): Promise<BackupRecordResponseDto> {
    return BackupRecordResponseDto.from((await this.requireRecord(id)) as unknown as Record<string, unknown>);
  }

  async findRecords(workspaceId: string, filter: BackupRecordFilterDto): Promise<PaginatedBackupRecordResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findRecords({ ...filter, workspaceId } as IBackupRecordFilterOptions);
    return PaginatedBackupRecordResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  /** What Disaster Recovery (or any caller) would want to know is currently usable — reused via the shared `BackupProviderRegistry` discovery flow, or read directly here for backup-management's own creation ledger. */
  async listAvailableBackups(workspaceId: string | null, targetType?: string): Promise<BackupRecordResponseDto[]> {
    const records = await this.repository.listAvailableRecords(workspaceId, targetType);
    return records.map((r) => BackupRecordResponseDto.from(r as unknown as Record<string, unknown>));
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async requirePolicy(id: string, workspaceId?: string): Promise<IBackupPolicy> {
    const policy = await this.repository.findPolicyById(id);
    if (!policy) throw new BackupPolicyNotFoundException(id);
    if (workspaceId !== undefined && policy.workspaceId !== null && policy.workspaceId !== workspaceId) {
      throw new BackupPolicyNotFoundException(id);
    }
    return policy;
  }

  private async requireRecord(id: string): Promise<IBackupRecord> {
    const record = await this.repository.findRecordById(id);
    if (!record) throw new BackupRecordNotFoundException(id);
    return record;
  }

  private async publishEvent(
    event: BackupManagementEvent,
    fields: { workspaceId?: string | null; policyId?: string; jobId?: string; backupRecordId?: string; performedBy?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      workspaceId: fields.workspaceId ?? null,
      policyId: fields.policyId,
      jobId: fields.jobId,
      backupRecordId: fields.backupRecordId,
      performedBy: fields.performedBy,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: BACKUP_MANAGEMENT_MODULE,
        entityType: 'BackupManagement',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
