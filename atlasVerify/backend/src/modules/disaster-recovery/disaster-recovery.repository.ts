import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IDrPolicy,
  IDrPolicyHistory,
  IDrRecoveryPlan,
  IDrRecoveryPlanHistory,
  IDrRecoveryExecution,
  IDrRecoveryCheckpoint,
  IDrBackupRecord,
  IDrRecoveryLock,
  IDrPolicyFilterOptions,
  IDrPlanFilterOptions,
  IDrExecutionFilterOptions,
  DrExecutionStatus,
} from './interfaces';
import { DISASTER_RECOVERY_CONSTANTS } from './constants';

@Injectable()
export class DisasterRecoveryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Policies ──────────────────────────────────────────────────

  async createPolicy(data: Partial<IDrPolicy>): Promise<IDrPolicy> {
    return this.prisma.drPolicy.create({ data: data as any }) as Promise<IDrPolicy>;
  }

  async findPolicyById(id: string): Promise<IDrPolicy | null> {
    return this.prisma.drPolicy.findFirst({ where: { id, deletedAt: null } }) as Promise<IDrPolicy | null>;
  }

  async findActivePolicy(workspaceId: string | null, criticalService: string): Promise<IDrPolicy | null> {
    return this.prisma.drPolicy.findFirst({
      where: { workspaceId, criticalService, deletedAt: null },
    }) as Promise<IDrPolicy | null>;
  }

  async updatePolicy(id: string, data: Partial<IDrPolicy>): Promise<IDrPolicy> {
    return this.prisma.drPolicy.update({ where: { id }, data: data as any }) as Promise<IDrPolicy>;
  }

  async findPolicies(filter: IDrPolicyFilterOptions): Promise<[IDrPolicy[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.OR = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    if (filter.organizationId !== undefined) where.organizationId = filter.organizationId;
    if (filter.environment) where.environment = filter.environment;
    if (filter.status) where.status = filter.status;
    if (filter.search) where.criticalService = { contains: filter.search, mode: 'insensitive' };

    const take = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = DISASTER_RECOVERY_CONSTANTS.POLICY_SORT_FIELDS.includes((filter.sortBy ?? 'recoveryPriority') as any)
      ? (filter.sortBy ?? 'recoveryPriority')
      : 'recoveryPriority';

    const [items, total] = await Promise.all([
      this.prisma.drPolicy.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'asc' }, take, skip }),
      this.prisma.drPolicy.count({ where: where as any }),
    ]);
    return [items as IDrPolicy[], total];
  }

  async createPolicyHistory(data: Partial<IDrPolicyHistory>): Promise<IDrPolicyHistory> {
    return this.prisma.drPolicyHistory.create({ data: data as any }) as Promise<IDrPolicyHistory>;
  }

  async findPolicyHistory(policyId: string): Promise<IDrPolicyHistory[]> {
    return this.prisma.drPolicyHistory.findMany({ where: { policyId }, orderBy: { createdAt: 'desc' } }) as Promise<IDrPolicyHistory[]>;
  }

  // ── Plans ─────────────────────────────────────────────────────

  async createPlan(data: Partial<IDrRecoveryPlan>): Promise<IDrRecoveryPlan> {
    return this.prisma.drRecoveryPlan.create({ data: data as any }) as Promise<IDrRecoveryPlan>;
  }

  async findPlanById(id: string): Promise<IDrRecoveryPlan | null> {
    return this.prisma.drRecoveryPlan.findFirst({ where: { id, deletedAt: null } }) as Promise<IDrRecoveryPlan | null>;
  }

  async findPlanByKey(workspaceId: string | null, key: string): Promise<IDrRecoveryPlan | null> {
    return this.prisma.drRecoveryPlan.findFirst({ where: { workspaceId, key, deletedAt: null } }) as Promise<IDrRecoveryPlan | null>;
  }

  async updatePlan(id: string, data: Partial<IDrRecoveryPlan>): Promise<IDrRecoveryPlan> {
    return this.prisma.drRecoveryPlan.update({ where: { id }, data: data as any }) as Promise<IDrRecoveryPlan>;
  }

  async findPlans(filter: IDrPlanFilterOptions): Promise<[IDrRecoveryPlan[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.workspaceId !== undefined) where.OR = [{ workspaceId: filter.workspaceId }, { workspaceId: null }];
    if (filter.policyId) where.policyId = filter.policyId;
    if (filter.scope) where.scope = filter.scope;
    if (filter.status) where.status = filter.status;
    if (filter.search) where.name = { contains: filter.search, mode: 'insensitive' };

    const take = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = DISASTER_RECOVERY_CONSTANTS.PLAN_SORT_FIELDS.includes((filter.sortBy ?? 'createdAt') as any)
      ? (filter.sortBy ?? 'createdAt')
      : 'createdAt';

    const [items, total] = await Promise.all([
      this.prisma.drRecoveryPlan.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.drRecoveryPlan.count({ where: where as any }),
    ]);
    return [items as IDrRecoveryPlan[], total];
  }

  async createPlanHistory(data: Partial<IDrRecoveryPlanHistory>): Promise<IDrRecoveryPlanHistory> {
    return this.prisma.drRecoveryPlanHistory.create({ data: data as any }) as Promise<IDrRecoveryPlanHistory>;
  }

  async findPlanHistory(planId: string): Promise<IDrRecoveryPlanHistory[]> {
    return this.prisma.drRecoveryPlanHistory.findMany({ where: { planId }, orderBy: { createdAt: 'desc' } }) as Promise<IDrRecoveryPlanHistory[]>;
  }

  // ── Executions ────────────────────────────────────────────────

  async createExecution(data: Partial<IDrRecoveryExecution>): Promise<IDrRecoveryExecution> {
    return this.prisma.drRecoveryExecution.create({ data: data as any }) as Promise<IDrRecoveryExecution>;
  }

  async findExecutionById(id: string): Promise<IDrRecoveryExecution | null> {
    return this.prisma.drRecoveryExecution.findFirst({ where: { id } }) as Promise<IDrRecoveryExecution | null>;
  }

  async findExecutionByIdempotencyKey(planId: string, idempotencyKey: string): Promise<IDrRecoveryExecution | null> {
    return this.prisma.drRecoveryExecution.findFirst({ where: { planId, idempotencyKey } }) as Promise<IDrRecoveryExecution | null>;
  }

  async findExecutionByWorkflowExecutionId(workflowExecutionId: string): Promise<IDrRecoveryExecution | null> {
    return this.prisma.drRecoveryExecution.findFirst({ where: { workflowExecutionId } }) as Promise<IDrRecoveryExecution | null>;
  }

  async updateExecution(id: string, data: Partial<IDrRecoveryExecution>): Promise<IDrRecoveryExecution> {
    return this.prisma.drRecoveryExecution.update({ where: { id }, data: data as any }) as Promise<IDrRecoveryExecution>;
  }

  async findExecutions(filter: IDrExecutionFilterOptions): Promise<[IDrRecoveryExecution[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.workspaceId !== undefined) where.workspaceId = filter.workspaceId;
    if (filter.planId) where.planId = filter.planId;
    if (filter.status) where.status = filter.status;

    const take = Math.min(filter.limit ?? DISASTER_RECOVERY_CONSTANTS.DEFAULT_PAGE_SIZE, DISASTER_RECOVERY_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const sortField = DISASTER_RECOVERY_CONSTANTS.EXECUTION_SORT_FIELDS.includes((filter.sortBy ?? 'startedAt') as any)
      ? (filter.sortBy ?? 'startedAt')
      : 'startedAt';

    const [items, total] = await Promise.all([
      this.prisma.drRecoveryExecution.findMany({ where: where as any, orderBy: { [sortField]: filter.sortOrder ?? 'desc' }, take, skip }),
      this.prisma.drRecoveryExecution.count({ where: where as any }),
    ]);
    return [items as IDrRecoveryExecution[], total];
  }

  async findActiveExecutionsForPlan(planId: string): Promise<IDrRecoveryExecution[]> {
    return this.prisma.drRecoveryExecution.findMany({
      where: { planId, status: { in: Array.from(DISASTER_RECOVERY_CONSTANTS.ACTIVE_EXECUTION_STATUSES) as DrExecutionStatus[] } },
    }) as Promise<IDrRecoveryExecution[]>;
  }

  // ── Checkpoints ───────────────────────────────────────────────

  async createCheckpoint(data: Partial<IDrRecoveryCheckpoint>): Promise<IDrRecoveryCheckpoint> {
    return this.prisma.drRecoveryCheckpoint.create({ data: data as any }) as Promise<IDrRecoveryCheckpoint>;
  }

  async updateCheckpoint(id: string, data: Partial<IDrRecoveryCheckpoint>): Promise<IDrRecoveryCheckpoint> {
    return this.prisma.drRecoveryCheckpoint.update({ where: { id }, data: data as any }) as Promise<IDrRecoveryCheckpoint>;
  }

  async listCheckpoints(executionId: string): Promise<IDrRecoveryCheckpoint[]> {
    return this.prisma.drRecoveryCheckpoint.findMany({ where: { executionId }, orderBy: { sequence: 'asc' } }) as Promise<IDrRecoveryCheckpoint[]>;
  }

  // ── Backup records ───────────────────────────────────────────

  async upsertBackupRecord(providerKey: string, externalRef: string, data: Partial<IDrBackupRecord>): Promise<IDrBackupRecord> {
    return this.prisma.drBackupRecord.upsert({
      where: { providerKey_externalRef: { providerKey, externalRef } },
      create: data as any,
      update: data as any,
    }) as Promise<IDrBackupRecord>;
  }

  async findLatestBackupRecord(workspaceId: string | null, targetType: string): Promise<IDrBackupRecord | null> {
    return this.prisma.drBackupRecord.findFirst({
      where: { workspaceId, targetType },
      orderBy: { capturedAt: 'desc' },
    }) as Promise<IDrBackupRecord | null>;
  }

  async listBackupRecords(workspaceId: string | null, targetType: string): Promise<IDrBackupRecord[]> {
    return this.prisma.drBackupRecord.findMany({
      where: { workspaceId, targetType },
      orderBy: { capturedAt: 'desc' },
    }) as Promise<IDrBackupRecord[]>;
  }

  // ── Recovery lock (idempotency / concurrency guard) ─────────────

  async acquireLock(scopeKey: string, executionId: string, expiresAt: Date): Promise<IDrRecoveryLock | null> {
    try {
      return (await this.prisma.drRecoveryLock.create({
        data: { scopeKey, executionId, expiresAt },
      })) as IDrRecoveryLock;
    } catch {
      return null; // unique constraint violation — already locked
    }
  }

  async findLock(scopeKey: string): Promise<IDrRecoveryLock | null> {
    return this.prisma.drRecoveryLock.findFirst({ where: { scopeKey } }) as Promise<IDrRecoveryLock | null>;
  }

  async releaseLock(scopeKey: string): Promise<void> {
    await this.prisma.drRecoveryLock.deleteMany({ where: { scopeKey } });
  }

  async reclaimExpiredLock(scopeKey: string, now: Date): Promise<void> {
    await this.prisma.drRecoveryLock.deleteMany({ where: { scopeKey, expiresAt: { lt: now } } });
  }
}
