import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type {
  IDiscoveryResult,
  IDiscoverySession,
  IDiscoveryStats,
  IMarketplaceProductCandidate,
} from './interfaces';
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

  private get candidateModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)[
      'marketplaceProductCandidate'
    ] as Record<string, unknown>;
  }

  private get snapshotModel(): Record<string, unknown> {
    return (this.prisma as unknown as Record<string, unknown>)[
      'marketplaceSnapshot'
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

  // ── MarketplaceProductCandidate / MarketplaceSnapshot ───────────────
  //
  // Global/shared, not workspace-scoped (Prompt 3 §5.B) — canonical
  // identity is (marketplaceKey, country, externalProductId), enforced by
  // a DB unique constraint so concurrent discovery workers upserting the
  // same real product cannot create duplicate candidate rows.

  /**
   * Upserts a candidate on its DB-enforced natural key. Returns the row and
   * whether it was newly created (vs. an already-known product being
   * rediscovered) so the caller can maintain accurate run counters.
   */
  async upsertCandidate(data: {
    marketplaceKey: string;
    country: string;
    externalProductId: string;
    title?: string | null;
    marketplaceCategory?: string | null;
  }): Promise<{ candidate: IMarketplaceProductCandidate; created: boolean }> {
    const upsert = this.candidateModel['upsert'] as (args: unknown) => Promise<unknown>;
    const where = {
      marketplaceKey_country_externalProductId: {
        marketplaceKey: data.marketplaceKey,
        country: data.country,
        externalProductId: data.externalProductId,
      },
    };

    // The `created` flag below is best-effort (a pre-check, not the
    // guarantee) — it can rarely double-count under a true concurrent race
    // on the exact same product and only affects the session's display
    // counters. Row-level duplicate protection is the DB unique constraint
    // on (marketplaceKey, country, externalProductId), enforced by the
    // atomic upsert itself regardless of this check's outcome.
    const findUnique = this.candidateModel['findUnique'] as (
      args: unknown,
    ) => Promise<unknown>;
    const existing = await findUnique({ where });

    const candidate = (await upsert({
      where,
      create: {
        marketplaceKey: data.marketplaceKey,
        country: data.country,
        externalProductId: data.externalProductId,
        title: data.title ?? null,
        marketplaceCategory: data.marketplaceCategory ?? null,
      },
      update: {
        title: data.title ?? undefined,
        marketplaceCategory: data.marketplaceCategory ?? undefined,
      },
    })) as IMarketplaceProductCandidate;

    return { candidate, created: existing === null };
  }

  async createSnapshot(data: {
    candidateId: string;
    salesRank?: number | null;
    price?: number | null;
    offerCount?: number | null;
    source: string;
    capturedAt: Date;
  }): Promise<void> {
    const create = this.snapshotModel['create'] as (args: unknown) => Promise<unknown>;
    await create({ data });
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
    // Same underlying value, two names: `totalNewOpportunities` is kept only
    // for historical API compatibility; `totalNewCandidates` is the
    // correctly-named field new/updated consumers should use — Discovery
    // counts newly discovered MarketplaceProductCandidate rows, not
    // Opportunity rows (see DiscoverySession.newOpportunities in schema.prisma).
    let totalNewCandidates = 0;
    let totalDuplicatesSkipped = 0;
    let runningSessions = 0;
    const byStatus: Record<string, number> = {};
    const byMarketplace: Record<string, number> = {};

    for (const row of rows) {
      totalDiscovered += row.totalDiscovered;
      totalNewCandidates += row.newOpportunities;
      totalDuplicatesSkipped += row.duplicatesSkipped;
      if (row.status === 'RUNNING') runningSessions++;
      byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
      byMarketplace[row.marketplace] = (byMarketplace[row.marketplace] ?? 0) + 1;
    }

    return {
      totalSessions: rows.length,
      runningSessions,
      totalDiscovered,
      totalNewCandidates,
      totalNewOpportunities: totalNewCandidates,
      totalDuplicatesSkipped,
      byMarketplace,
      byStatus,
    };
  }
}
