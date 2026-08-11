import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { QuotaOverrideStatus, QuotaPolicyStatus, IQuotaHistory, IQuotaOverride, IQuotaPolicy, IQuotaState } from './interfaces';
import { QuotaPolicyFilterDto, QuotaOverrideFilterDto } from './dto';

@Injectable()
export class QuotaManagementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Policies ─────────────────────────────────────────────────────

  async createPolicy(data: Partial<IQuotaPolicy>): Promise<IQuotaPolicy> {
    return this.prisma.quotaPolicy.create({ data: data as any }) as Promise<IQuotaPolicy>;
  }

  async findPolicyById(id: string): Promise<IQuotaPolicy | null> {
    return this.prisma.quotaPolicy.findFirst({ where: { id } }) as Promise<IQuotaPolicy | null>;
  }

  async findPolicyByIdentity(scopeKey: string, resourceKey: string, feature: string): Promise<IQuotaPolicy | null> {
    return this.prisma.quotaPolicy.findFirst({ where: { scopeKey, resourceKey, feature } }) as Promise<IQuotaPolicy | null>;
  }

  /** Resolution-time lookup — every ACTIVE policy for this resource/feature matching any of the candidate scope keys, for the service to rank by precedence. */
  async findApplicablePolicies(scopeKeys: string[], resourceKey: string, feature: string): Promise<IQuotaPolicy[]> {
    return this.prisma.quotaPolicy.findMany({
      where: { scopeKey: { in: scopeKeys }, resourceKey, feature, status: QuotaPolicyStatus.ACTIVE as any },
    }) as Promise<IQuotaPolicy[]>;
  }

  async findAllPolicies(workspaceId: string, filter: QuotaPolicyFilterDto): Promise<[IQuotaPolicy[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scopeType) where.scopeType = filter.scopeType;
    if (filter.status) where.status = filter.status;
    if (filter.resourceKey) where.resourceKey = filter.resourceKey;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.quotaPolicy.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.quotaPolicy.count({ where: where as any }),
    ]);

    return [data as IQuotaPolicy[], total];
  }

  async updatePolicy(id: string, data: Partial<IQuotaPolicy>): Promise<IQuotaPolicy> {
    return this.prisma.quotaPolicy.update({ where: { id }, data: data as any }) as Promise<IQuotaPolicy>;
  }

  // ── Overrides ────────────────────────────────────────────────────

  async createOverride(data: Partial<IQuotaOverride>): Promise<IQuotaOverride> {
    return this.prisma.quotaOverride.create({ data: data as any }) as Promise<IQuotaOverride>;
  }

  async findOverrideById(id: string): Promise<IQuotaOverride | null> {
    return this.prisma.quotaOverride.findFirst({ where: { id } }) as Promise<IQuotaOverride | null>;
  }

  async findActiveOverrides(scopeKey: string, resourceKey: string, feature: string): Promise<IQuotaOverride[]> {
    return this.prisma.quotaOverride.findMany({
      where: { scopeKey, resourceKey, feature, status: QuotaOverrideStatus.ACTIVE as any },
    }) as Promise<IQuotaOverride[]>;
  }

  async findAllOverrides(workspaceId: string, filter: QuotaOverrideFilterDto): Promise<[IQuotaOverride[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.status) where.status = filter.status;
    if (filter.resourceKey) where.resourceKey = filter.resourceKey;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.quotaOverride.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.quotaOverride.count({ where: where as any }),
    ]);

    return [data as IQuotaOverride[], total];
  }

  async updateOverride(id: string, data: Partial<IQuotaOverride>): Promise<IQuotaOverride> {
    return this.prisma.quotaOverride.update({ where: { id }, data: data as any }) as Promise<IQuotaOverride>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async findExpiredActiveOverrides(before: Date): Promise<IQuotaOverride[]> {
    return this.prisma.quotaOverride.findMany({
      where: { status: QuotaOverrideStatus.ACTIVE as any, expiresAt: { lte: before } },
    }) as Promise<IQuotaOverride[]>;
  }

  async findStatesDueForReset(before: Date): Promise<IQuotaState[]> {
    return this.prisma.quotaState.findMany({ where: { nextResetAt: { lte: before } } }) as Promise<IQuotaState[]>;
  }

  // ── State ────────────────────────────────────────────────────────

  async findState(scopeKey: string, resourceKey: string, feature: string): Promise<IQuotaState | null> {
    return this.prisma.quotaState.findFirst({ where: { scopeKey, resourceKey, feature } }) as Promise<IQuotaState | null>;
  }

  async createState(data: Partial<IQuotaState>): Promise<IQuotaState> {
    return this.prisma.quotaState.create({ data: data as any }) as Promise<IQuotaState>;
  }

  async updateState(id: string, data: Partial<IQuotaState>): Promise<IQuotaState> {
    return this.prisma.quotaState.update({ where: { id }, data: data as any }) as Promise<IQuotaState>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IQuotaHistory>): Promise<IQuotaHistory> {
    return this.prisma.quotaHistory.create({ data: data as any }) as Promise<IQuotaHistory>;
  }

  async findHistory(entityId: string): Promise<IQuotaHistory[]> {
    return this.prisma.quotaHistory.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }) as Promise<IQuotaHistory[]>;
  }
}
