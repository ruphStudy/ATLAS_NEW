import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IBackupPolicy,
  IBackupPolicyHistory,
  IBackupJob,
  IBackupRecord,
  IBackupLock,
  IBackupPolicyFilterOptions,
  IBackupJobFilterOptions,
  IBackupRecordFilterOptions,
} from './interfaces';
import { BACKUP_MANAGEMENT_CONSTANTS } from './constants';

@Injectable()
export class BackupManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Policies ──────────────────────────────────────────────────

  async createPolicy(data: Partial<IBackupPolicy>): Promise<IBackupPolicy> {
    return this.prisma.backupPolicy.create({ data: data as any }) as Promise<IBackupPolicy>;
  }

  async findPolicyById(id: string): Promise<IBackupPolicy | null> {
    return this.prisma.backupPolicy.findFirst({ where: { id, deletedAt: null } }) as Promise<IBackupPolicy | null>;
  }

  async findActivePolicy(workspaceId: string | null, service: string, dataType: string): Promise<IBackupPolicy | null> {
    return this.prisma.backupPolicy.findFirst({
      where: { workspaceId, service, dataType, deletedAt: null },
    }) as Promise<IBackupPolicy | null>;
  }

  async updatePolicy(id: string, data: Partial<IBackupPolicy>): Promise<IBackupPolicy> {
    return this.prisma.backupPolicy.update({ where: { id }, data: data as any }) as Promise<IBackupPolicy>;
  }

  async findPolicies(filter: IBackupPolicyFilterOptions): Promise<[IBackupPolicy[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.OR = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    if (filter.organizationId !== undefined) where.organizationId = filter.organizationId;
    if (filter.environment) where.environment = filter.environment;
    if (filter.status) where.status = filter.status;
    if (filter.search) where.service = { contains: filter.search, mode: 'insensitive' };

    const take = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = BACKUP_MANAGEMENT_CONSTANTS.POLICY_SORT_FIELDS.includes((filter.sortBy ?? 'createdAt') as any)
      ? (filter.sortBy ?? 'createdAt')
      : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.backupPolicy.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.backupPolicy.count({ where: where as any }),
    ]);
    return [items as IBackupPolicy[], total];
  }

  /** Every ACTIVE policy with a schedule configured — the candidate set for `processDueScheduledBackups()`. */
  async findSchedulablePolicies(): Promise<IBackupPolicy[]> {
    return this.prisma.backupPolicy.findMany({
      where: { status: 'ACTIVE' as any, deletedAt: null, frequencyMinutes: { not: null } },
      take: BACKUP_MANAGEMENT_CONSTANTS.SCAN_LIMIT,
    }) as Promise<IBackupPolicy[]>;
  }

  async createPolicyHistory(data: Partial<IBackupPolicyHistory>): Promise<IBackupPolicyHistory> {
    return this.prisma.backupPolicyHistory.create({ data: data as any }) as Promise<IBackupPolicyHistory>;
  }

  async findPolicyHistory(policyId: string): Promise<IBackupPolicyHistory[]> {
    return this.prisma.backupPolicyHistory.findMany({ where: { policyId }, orderBy: { createdAt: 'desc' } }) as Promise<IBackupPolicyHistory[]>;
  }

  // ── Jobs ──────────────────────────────────────────────────────

  async createJob(data: Partial<IBackupJob>): Promise<IBackupJob> {
    return this.prisma.backupJob.create({ data: data as any }) as Promise<IBackupJob>;
  }

  async findJobById(id: string): Promise<IBackupJob | null> {
    return this.prisma.backupJob.findFirst({ where: { id } }) as Promise<IBackupJob | null>;
  }

  async findJobByIdempotencyKey(policyId: string, idempotencyKey: string): Promise<IBackupJob | null> {
    return this.prisma.backupJob.findFirst({ where: { policyId, idempotencyKey } }) as Promise<IBackupJob | null>;
  }

  async updateJob(id: string, data: Partial<IBackupJob>): Promise<IBackupJob> {
    return this.prisma.backupJob.update({ where: { id }, data: data as any }) as Promise<IBackupJob>;
  }

  async findJobs(filter: IBackupJobFilterOptions): Promise<[IBackupJob[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId !== undefined) where.workspaceId = filter.workspaceId;
    if (filter.policyId) where.policyId = filter.policyId;
    if (filter.status) where.status = filter.status;

    const take = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = BACKUP_MANAGEMENT_CONSTANTS.JOB_SORT_FIELDS.includes((filter.sortBy ?? 'startedAt') as any)
      ? (filter.sortBy ?? 'startedAt')
      : 'startedAt';

    const [items, total] = await Promise.all([
      this.prisma.backupJob.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.backupJob.count({ where: where as any }),
    ]);
    return [items as IBackupJob[], total];
  }

  // ── Backup records ───────────────────────────────────────────

  async createRecord(data: Partial<IBackupRecord>): Promise<IBackupRecord> {
    return this.prisma.backupRecord.create({ data: data as any }) as Promise<IBackupRecord>;
  }

  async findRecordById(id: string): Promise<IBackupRecord | null> {
    return this.prisma.backupRecord.findFirst({ where: { id } }) as Promise<IBackupRecord | null>;
  }

  async updateRecord(id: string, data: Partial<IBackupRecord>): Promise<IBackupRecord> {
    return this.prisma.backupRecord.update({ where: { id }, data: data as any }) as Promise<IBackupRecord>;
  }

  async findRecords(filter: IBackupRecordFilterOptions): Promise<[IBackupRecord[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId !== undefined) where.workspaceId = filter.workspaceId;
    if (filter.policyId) where.policyId = filter.policyId;
    if (filter.targetType) where.targetType = filter.targetType;
    if (filter.status) where.status = filter.status;

    const take = Math.min(filter.limit ?? BACKUP_MANAGEMENT_CONSTANTS.DEFAULT_PAGE_SIZE, BACKUP_MANAGEMENT_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = BACKUP_MANAGEMENT_CONSTANTS.RECORD_SORT_FIELDS.includes((filter.sortBy ?? 'capturedAt') as any)
      ? (filter.sortBy ?? 'capturedAt')
      : 'capturedAt';

    const [items, total] = await Promise.all([
      this.prisma.backupRecord.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.backupRecord.count({ where: where as any }),
    ]);
    return [items as IBackupRecord[], total];
  }

  /** Available, non-expired backups for a scope — what Disaster Recovery (or any caller) would want to know is currently usable. */
  async listAvailableRecords(workspaceId: string | null, targetType?: string): Promise<IBackupRecord[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      status: { in: ['AVAILABLE', 'VERIFIED'] },
    };
    if (targetType) where.targetType = targetType;
    return this.prisma.backupRecord.findMany({ where: where as any, orderBy: { capturedAt: 'desc' } }) as Promise<IBackupRecord[]>;
  }

  async findRecordsPastExpiry(now: Date, limit = BACKUP_MANAGEMENT_CONSTANTS.SCAN_LIMIT): Promise<IBackupRecord[]> {
    return this.prisma.backupRecord.findMany({
      where: { expiresAt: { lt: now }, status: { notIn: ['EXPIRED', 'DELETED'] } },
      take: limit,
    }) as Promise<IBackupRecord[]>;
  }

  /** Backups beyond a policy's `maxVersions` retention cap, oldest first — candidates for rotation cleanup. Uses `skip` so only the excess rows are ever transferred, not the policy's full history. */
  async findExcessVersions(policyId: string, maxVersions: number): Promise<IBackupRecord[]> {
    return this.prisma.backupRecord.findMany({
      where: { policyId, status: { notIn: ['EXPIRED', 'DELETED'] } },
      orderBy: { capturedAt: 'desc' },
      skip: maxVersions,
      take: BACKUP_MANAGEMENT_CONSTANTS.SCAN_LIMIT,
    }) as Promise<IBackupRecord[]>;
  }

  // ── Lock (idempotency / concurrency guard) ──────────────────────

  async acquireLock(scopeKey: string, jobId: string, expiresAt: Date): Promise<IBackupLock | null> {
    try {
      return (await this.prisma.backupLock.create({ data: { scopeKey, jobId, expiresAt } })) as IBackupLock;
    } catch {
      return null;
    }
  }

  async releaseLock(scopeKey: string): Promise<void> {
    await this.prisma.backupLock.deleteMany({ where: { scopeKey } });
  }

  async reclaimExpiredLock(scopeKey: string, now: Date): Promise<void> {
    await this.prisma.backupLock.deleteMany({ where: { scopeKey, expiresAt: { lt: now } } });
  }
}
