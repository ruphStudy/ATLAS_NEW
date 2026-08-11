import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  FeatureFlagDefinitionStatus,
  FeatureFlagOverrideStatus,
  IFeatureFlagDefinition,
  IFeatureFlagHistory,
  IFeatureFlagOverride,
} from './interfaces';
import { FeatureFlagDefinitionFilterDto, FeatureFlagOverrideFilterDto } from './dto';

@Injectable()
export class FeatureFlagsRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Definitions (global — not tenant-owned; overrides carry tenant scope) ──

  async createDefinition(data: Partial<IFeatureFlagDefinition>): Promise<IFeatureFlagDefinition> {
    return this.prisma.featureFlagDefinition.create({ data: data as any }) as Promise<IFeatureFlagDefinition>;
  }

  async findDefinitionByKey(key: string): Promise<IFeatureFlagDefinition | null> {
    return this.prisma.featureFlagDefinition.findFirst({ where: { key } }) as Promise<IFeatureFlagDefinition | null>;
  }

  async findAllDefinitionKeysAndDependencies(): Promise<{ key: string; dependencies: string[] }[]> {
    return this.prisma.featureFlagDefinition.findMany({ select: { key: true, dependencies: true } });
  }

  async findAllDefinitions(filter: FeatureFlagDefinitionFilterDto): Promise<[IFeatureFlagDefinition[], number]> {
    const where: Record<string, unknown> = {};
    if (filter.type) where.type = filter.type;
    if (filter.status) where.status = filter.status;
    if (filter.search) {
      where.OR = [{ key: { contains: filter.search, mode: 'insensitive' } }, { name: { contains: filter.search, mode: 'insensitive' } }];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.featureFlagDefinition.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.featureFlagDefinition.count({ where: where as any }),
    ]);

    return [data as IFeatureFlagDefinition[], total];
  }

  async updateDefinition(key: string, data: Partial<IFeatureFlagDefinition>): Promise<IFeatureFlagDefinition> {
    return this.prisma.featureFlagDefinition.update({ where: { key }, data: data as any }) as Promise<IFeatureFlagDefinition>;
  }

  // ── Scheduler-callable sweeps (no active scheduler wired — mirrors every other module this session) ──

  async findActiveDefinitionsPastEndDate(before: Date): Promise<IFeatureFlagDefinition[]> {
    return this.prisma.featureFlagDefinition.findMany({
      where: { status: FeatureFlagDefinitionStatus.ACTIVE as any, endDate: { lte: before } },
    }) as Promise<IFeatureFlagDefinition[]>;
  }

  async findActiveOverridesPastEndDate(before: Date): Promise<IFeatureFlagOverride[]> {
    return this.prisma.featureFlagOverride.findMany({
      where: { status: FeatureFlagOverrideStatus.ACTIVE as any, endDate: { lte: before } },
    }) as Promise<IFeatureFlagOverride[]>;
  }

  // ── Overrides ────────────────────────────────────────────────────

  async createOverride(data: Partial<IFeatureFlagOverride>): Promise<IFeatureFlagOverride> {
    return this.prisma.featureFlagOverride.create({ data: data as any }) as Promise<IFeatureFlagOverride>;
  }

  async findOverrideById(id: string): Promise<IFeatureFlagOverride | null> {
    return this.prisma.featureFlagOverride.findFirst({ where: { id } }) as Promise<IFeatureFlagOverride | null>;
  }

  async findOverrideByFlagAndScopeKey(flagKey: string, scopeKey: string): Promise<IFeatureFlagOverride | null> {
    return this.prisma.featureFlagOverride.findFirst({ where: { flagKey, scopeKey } }) as Promise<IFeatureFlagOverride | null>;
  }

  /** Evaluation-time lookup — every ACTIVE override for this flag matching any of the candidate scope keys, for the service to rank by precedence. */
  async findOverrideCandidates(flagKey: string, scopeKeys: string[]): Promise<IFeatureFlagOverride[]> {
    return this.prisma.featureFlagOverride.findMany({
      where: { flagKey, scopeKey: { in: scopeKeys }, status: FeatureFlagOverrideStatus.ACTIVE as any },
    }) as Promise<IFeatureFlagOverride[]>;
  }

  async findOverridesForFlag(flagKey: string): Promise<IFeatureFlagOverride[]> {
    return this.prisma.featureFlagOverride.findMany({ where: { flagKey }, orderBy: { createdAt: 'desc' } }) as Promise<IFeatureFlagOverride[]>;
  }

  async findAllOverrides(workspaceId: string, filter: FeatureFlagOverrideFilterDto): Promise<[IFeatureFlagOverride[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.scope) where.scope = filter.scope;
    if (filter.status) where.status = filter.status;

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.featureFlagOverride.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.featureFlagOverride.count({ where: where as any }),
    ]);

    return [data as IFeatureFlagOverride[], total];
  }

  async updateOverride(id: string, data: Partial<IFeatureFlagOverride>): Promise<IFeatureFlagOverride> {
    return this.prisma.featureFlagOverride.update({ where: { id }, data: data as any }) as Promise<IFeatureFlagOverride>;
  }

  // ── History ──────────────────────────────────────────────────────

  async createHistory(data: Partial<IFeatureFlagHistory>): Promise<IFeatureFlagHistory> {
    return this.prisma.featureFlagHistory.create({ data: data as any }) as Promise<IFeatureFlagHistory>;
  }

  async findHistory(entityId: string): Promise<IFeatureFlagHistory[]> {
    return this.prisma.featureFlagHistory.findMany({ where: { entityId }, orderBy: { createdAt: 'asc' } }) as Promise<IFeatureFlagHistory[]>;
  }
}
