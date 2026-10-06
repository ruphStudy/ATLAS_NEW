import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { IOpportunity, IOpportunityListResult, IPromotableCandidate } from './interfaces';
import type { OpportunityFilterDto } from './dto';

/**
 * OpportunityRepository
 *
 * Rule: Data access only. No business logic.
 *       All queries are scoped to a workspaceId for tenant isolation.
 */
@Injectable()
export class OpportunityRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  async create(data: Record<string, unknown>): Promise<IOpportunity> {
    return this.call<IOpportunity>('opportunity', 'create', { data });
  }

  async findById(id: string, workspaceId: string): Promise<IOpportunity | null> {
    return this.call<IOpportunity | null>('opportunity', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findAll(
    workspaceId: string,
    filter: OpportunityFilterDto,
  ): Promise<[IOpportunity[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.status !== undefined && { status: filter.status }),
      ...(filter.marketplace !== undefined && { marketplace: filter.marketplace }),
      ...(filter.keyword !== undefined && {
        keyword: { contains: filter.keyword, mode: 'insensitive' },
      }),
      ...((filter.minFinalScore !== undefined || filter.maxFinalScore !== undefined) && {
        finalScore: {
          ...(filter.minFinalScore !== undefined && { gte: filter.minFinalScore }),
          ...(filter.maxFinalScore !== undefined && { lte: filter.maxFinalScore }),
        },
      }),
    };

    const orderBy = filter.sortBy
      ? { [filter.sortBy]: filter.sortOrder ?? 'desc' }
      : { createdAt: 'desc' as const };

    const [items, total] = await Promise.all([
      this.call<IOpportunity[]>('opportunity', 'findMany', {
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy,
      }),
      this.call<number>('opportunity', 'count', { where }),
    ]);

    return [items, total];
  }

  async update(id: string, data: Record<string, unknown>): Promise<IOpportunity> {
    return this.call<IOpportunity>('opportunity', 'update', {
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.call<void>('opportunity', 'update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Promotion (Case 11 / Prompt 4) ──────────────────────────────

  async findCandidateById(id: string): Promise<IPromotableCandidate | null> {
    return this.call<IPromotableCandidate | null>('marketplaceProductCandidate', 'findUnique', {
      where: { id },
      select: {
        id: true,
        marketplaceKey: true,
        country: true,
        externalProductId: true,
        title: true,
        marketplaceCategory: true,
      },
    });
  }

  /** Active (non-deleted) Opportunity already linked to this candidate for this workspace, if any — used to make promotion idempotent. */
  async findActiveByCandidateId(
    workspaceId: string,
    marketplaceProductCandidateId: string,
  ): Promise<IOpportunity | null> {
    return this.call<IOpportunity | null>('opportunity', 'findFirst', {
      where: { workspaceId, marketplaceProductCandidateId, deletedAt: null },
    });
  }
}

/** True when `err` is a Prisma unique-constraint violation (P2002) — matches the existing detection convention used elsewhere in this codebase. */
export function isUniqueConstraintError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: string }).code === 'P2002';
}
