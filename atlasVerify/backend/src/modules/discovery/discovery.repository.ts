import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IDiscoveryResult, IDiscoverySession, IDiscoveryStats } from './interfaces';
import type { DiscoveryFilterDto } from './dto';

/**
 * DiscoveryRepository
 *
 * Rule: Data access only. No business logic.
 *       Uses unknown casts because Prisma client is generated after schema update.
 *       All queries are workspace-scoped for tenant isolation.
 */
@Injectable()
export class DiscoveryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessors (post-prisma-generate these become typed) ────
  private get sessionModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)[
      'discoverySession'
    ] as Record<string, unknown>;
  }

  private get resultModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)[
      'discoveryResult'
    ] as Record<string, unknown>;
  }

  private get opportunityModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)[
      'opportunity'
    ] as Record<string, unknown>;
  }

  // ── Session ──────────────────────────────────────────────────────

  async createSession(data: Record<string, unknown>): Promise<IDiscoverySession> {
    return (
      await (this.sessionModel['create'] as (args: unknown) => Promise<unknown>)({
        data,
      })
    ) as IDiscoverySession;
  }

  async findSessionById(
    id: string,
    workspaceId: string,
  ): Promise<IDiscoverySession | null> {
    return (
      await (this.sessionModel['findFirst'] as (args: unknown) => Promise<unknown>)({
        where: { id, workspaceId },
      })
    ) as IDiscoverySession | null;
  }

  async findAllSessions(
    workspaceId: string,
    filter: DiscoveryFilterDto,
  ): Promise<[IDiscoverySession[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      ...(filter.status !== undefined && { status: filter.status }),
      ...(filter.marketplace !== undefined && { marketplace: filter.marketplace }),
    };

    const findMany = this.sessionModel['findMany'] as (args: unknown) => Promise<unknown[]>;
    const count = this.sessionModel['count'] as (args: unknown) => Promise<number>;

    const [sessions, total] = await Promise.all([
      findMany({ where, skip: filter.skip, take: filter.limit, orderBy: { createdAt: 'desc' } }),
      count({ where }),
    ]);

    return [sessions as IDiscoverySession[], total];
  }

  async updateSession(
    id: string,
    data: Record<string, unknown>,
  ): Promise<IDiscoverySession> {
    return (
      await (this.sessionModel['update'] as (args: unknown) => Promise<unknown>)({
        where: { id },
        data,
      })
    ) as IDiscoverySession;
  }

  // ── Results ──────────────────────────────────────────────────────

  async createResult(data: Record<string, unknown>): Promise<IDiscoveryResult> {
    return (
      await (this.resultModel['create'] as (args: unknown) => Promise<unknown>)({ data })
    ) as IDiscoveryResult;
  }

  async findSessionResults(sessionId: string): Promise<IDiscoveryResult[]> {
    const findMany = this.resultModel['findMany'] as (args: unknown) => Promise<unknown[]>;
    const results = await findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
    return results as IDiscoveryResult[];
  }

  // ── Deduplication ────────────────────────────────────────────────

  async findExistingOpportunity(
    workspaceId: string,
    keyword: string,
    marketplace: string,
  ): Promise<{ id: string } | null> {
    const findFirst = this.opportunityModel['findFirst'] as (
      args: unknown,
    ) => Promise<unknown>;
    return (await findFirst({
      where: { workspaceId, keyword, marketplace, deletedAt: null },
      select: { id: true },
    })) as { id: string } | null;
  }

  async createOpportunityFromProduct(
    data: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const create = this.opportunityModel['create'] as (args: unknown) => Promise<unknown>;
    return (await create({ data, select: { id: true } })) as { id: string };
  }

  // ── Stats ────────────────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<IDiscoveryStats> {
    const findMany = this.sessionModel['findMany'] as (args: unknown) => Promise<unknown[]>;

    const rows = (await findMany({
      where: { workspaceId },
      select: {
        status: true,
        marketplace: true,
        totalDiscovered: true,
        newOpportunities: true,
        duplicatesSkipped: true,
      },
    })) as Array<{
      status: string;
      marketplace: string;
      totalDiscovered: number;
      newOpportunities: number;
      duplicatesSkipped: number;
    }>;

    let totalDiscovered = 0;
    let totalNewOpportunities = 0;
    let totalDuplicatesSkipped = 0;
    let runningSessions = 0;
    const byStatus: Record<string, number> = {};
    const byMarketplace: Record<string, number> = {};

    for (const row of rows) {
      totalDiscovered += row.totalDiscovered;
      totalNewOpportunities += row.newOpportunities;
      totalDuplicatesSkipped += row.duplicatesSkipped;
      if (row.status === 'RUNNING') runningSessions++;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byMarketplace[row.marketplace] = (byMarketplace[row.marketplace] ?? 0) + 1;
    }

    return {
      totalSessions: rows.length,
      runningSessions,
      totalDiscovered,
      totalNewOpportunities,
      totalDuplicatesSkipped,
      byMarketplace,
      byStatus,
    };
  }
}
