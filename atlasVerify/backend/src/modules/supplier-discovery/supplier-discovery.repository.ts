import { ConflictException, Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { SupplierSourceProvider } from './interfaces';
import type {
  IOpportunitySupplierLink,
  ISupplier,
  ISupplierDiscoverySession,
  ISupplierDiscoveryStats,
} from './interfaces';
import type { SupplierFilterDto, SupplierSessionFilterDto } from './dto';

@Injectable()
export class SupplierDiscoveryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessors ──────────────────────────────────────────
  private get supplierModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['supplier'] as Record<string, unknown>;
  }
  private get sessionModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['supplierDiscoverySession'] as Record<string, unknown>;
  }
  private get resultModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['supplierDiscoveryResult'] as Record<string, unknown>;
  }
  private get linkModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)['opportunitySupplier'] as Record<string, unknown>;
  }

  // ── Supplier CRUD ────────────────────────────────────────────

  async createSupplier(data: Record<string, unknown>): Promise<ISupplier> {
    return ((await (this.supplierModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as ISupplier);
  }

  async createSupplierFromDiscovery(data: Record<string, unknown>): Promise<{ id: string }> {
    return ((await (this.supplierModel['create'] as (a: unknown) => Promise<unknown>)({ data, select: { id: true } })) as { id: string });
  }

  async findSupplierById(id: string, workspaceId: string): Promise<ISupplier | null> {
    return ((await (this.supplierModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { id, workspaceId, deletedAt: null },
    })) as ISupplier | null);
  }

  async findAllSuppliers(workspaceId: string, filter: SupplierFilterDto): Promise<[ISupplier[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status && { status: filter.status }),
      ...(filter.tier && { tier: filter.tier }),
      ...(filter.provider && { provider: filter.provider }),
      ...(filter.country && { country: filter.country.toUpperCase() }),
      ...(filter.search && { name: { contains: filter.search, mode: 'insensitive' } }),
    };
    const orderBy = filter.sortBy ? { [filter.sortBy]: filter.sortOrder ?? 'desc' } : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      (this.supplierModel['findMany'] as (a: unknown) => Promise<unknown[]>)({ where, skip: filter.skip, take: filter.limit, orderBy }),
      (this.supplierModel['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);
    return [items as ISupplier[], total];
  }

  async updateSupplier(id: string, data: Record<string, unknown>): Promise<ISupplier> {
    return ((await (this.supplierModel['update'] as (a: unknown) => Promise<unknown>)({ where: { id }, data })) as ISupplier);
  }

  async softDeleteSupplier(id: string): Promise<void> {
    await (this.supplierModel['update'] as (a: unknown) => Promise<unknown>)({ where: { id }, data: { deletedAt: new Date() } });
  }

  async findDuplicateSupplier(workspaceId: string, provider: SupplierSourceProvider, providerSupplierId: string): Promise<{ id: string } | null> {
    return ((await (this.supplierModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { workspaceId, provider, providerSupplierId, deletedAt: null },
      select: { id: true },
    })) as { id: string } | null);
  }

  // ── Opportunity links ────────────────────────────────────────

  async linkToOpportunity(data: Record<string, unknown>): Promise<IOpportunitySupplierLink> {
    try {
      return ((await (this.linkModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as IOpportunitySupplierLink);
    } catch (err: unknown) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictException('Supplier is already linked to this opportunity');
      }
      throw err;
    }
  }

  async unlinkFromOpportunity(supplierId: string, opportunityId: string, workspaceId: string): Promise<void> {
    await (this.linkModel['deleteMany'] as (a: unknown) => Promise<unknown>)({
      where: { supplierId, opportunityId, workspaceId },
    });
  }

  async getOpportunitySuppliers(opportunityId: string, workspaceId: string): Promise<IOpportunitySupplierLink[]> {
    const rows = await (this.linkModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { opportunityId, workspaceId },
      orderBy: { rank: 'asc' },
    });
    return rows as IOpportunitySupplierLink[];
  }

  // ── Sessions ─────────────────────────────────────────────────

  async createSession(data: Record<string, unknown>): Promise<ISupplierDiscoverySession> {
    return ((await (this.sessionModel['create'] as (a: unknown) => Promise<unknown>)({ data })) as ISupplierDiscoverySession);
  }

  async findSessionById(id: string, workspaceId: string): Promise<ISupplierDiscoverySession | null> {
    return ((await (this.sessionModel['findFirst'] as (a: unknown) => Promise<unknown>)({
      where: { id, workspaceId },
    })) as ISupplierDiscoverySession | null);
  }

  async findAllSessions(workspaceId: string, filter: SupplierSessionFilterDto): Promise<[ISupplierDiscoverySession[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.provider && { provider: filter.provider }),
      ...(filter.keyword && { keyword: { contains: filter.keyword, mode: 'insensitive' } }),
    };

    const [items, total] = await Promise.all([
      (this.sessionModel['findMany'] as (a: unknown) => Promise<unknown[]>)({ where, skip: filter.skip, take: filter.limit, orderBy: { createdAt: 'desc' } }),
      (this.sessionModel['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);
    return [items as ISupplierDiscoverySession[], total];
  }

  async updateSession(id: string, data: Record<string, unknown>): Promise<ISupplierDiscoverySession> {
    return ((await (this.sessionModel['update'] as (a: unknown) => Promise<unknown>)({ where: { id }, data })) as ISupplierDiscoverySession);
  }

  async createResult(data: Record<string, unknown>): Promise<void> {
    await (this.resultModel['create'] as (a: unknown) => Promise<unknown>)({ data });
  }

  async findSessionResults(sessionId: string): Promise<unknown[]> {
    return (this.resultModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Stats ─────────────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<ISupplierDiscoveryStats> {
    const [sessionRows, supplierRows] = await Promise.all([
      (this.sessionModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where: { workspaceId },
        select: { status: true, provider: true, totalDiscovered: true, newSuppliers: true, duplicatesSkipped: true },
      }),
      (this.supplierModel['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where: { workspaceId, deletedAt: null },
        select: { tier: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byTier: Record<string, number> = {};
    let totalNewSuppliers = 0;
    let totalDuplicatesSkipped = 0;
    let runningSessions = 0;

    for (const row of sessionRows as Array<{ status: string; provider: string; newSuppliers: number; duplicatesSkipped: number }>) {
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byProvider[row.provider] = (byProvider[row.provider] ?? 0) + 1;
      totalNewSuppliers += row.newSuppliers;
      totalDuplicatesSkipped += row.duplicatesSkipped;
      if (row.status === 'RUNNING') runningSessions++;
    }

    for (const row of supplierRows as Array<{ tier: string }>) {
      byTier[row.tier] = (byTier[row.tier] ?? 0) + 1;
    }

    return {
      totalSessions: sessionRows.length,
      runningSessions,
      totalSuppliers: supplierRows.length,
      totalNewSuppliers,
      totalDuplicatesSkipped,
      byProvider,
      byStatus,
      byTier,
    };
  }
}
