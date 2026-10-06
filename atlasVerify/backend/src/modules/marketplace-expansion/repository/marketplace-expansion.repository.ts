import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { MarketplaceExpansionFilterOptions } from '../interfaces';
import { MARKETPLACE_EXPANSION_CONSTANTS } from '../constants';

@Injectable()
export class MarketplaceExpansionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Internal Helpers ──────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Expansion ───────────────────────────────────────────────

  async createExpansion(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceExpansion', 'create', { data });
  }

  async findExpansionById(id: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceExpansion', 'findFirst', {
      where: { id, deletedAt: null },
    });
  }

  async findExpansion(providerKey: string, workspaceId: string | null): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceExpansion', 'findFirst', {
      where: { providerKey, workspaceId, deletedAt: null },
    });
  }

  /** Prefers a workspace-scoped expansion override over the platform-wide one for the same provider. */
  async resolveExpansion(providerKey: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    const scoped = await this.findExpansion(providerKey, workspaceId);
    if (scoped) return scoped;
    return this.findExpansion(providerKey, null);
  }

  async updateExpansion(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceExpansion', 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findExpansions(filter: MarketplaceExpansionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null };
    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.workspaceId !== undefined) where['workspaceId'] = filter.workspaceId;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.rolloutState) where['rolloutState'] = filter.rolloutState;
    if (filter.search) {
      where['providerKey'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = MARKETPLACE_EXPANSION_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'providerKey'] ?? 'providerKey';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? MARKETPLACE_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, MARKETPLACE_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceExpansion', 'findMany', { where, orderBy, take, skip }),
      this.call<number>('marketplaceExpansion', 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Expansion History ─────────────────────────────────────

  async createExpansionHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceExpansionHistory', 'create', { data });
  }

  async findExpansionHistory(expansionId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceExpansionHistory', 'findMany', {
      where: { expansionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
