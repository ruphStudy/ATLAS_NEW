import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IAiProviderExpansionFilterOptions } from './interfaces';
import { AI_PROVIDER_EXPANSION_CONSTANTS } from './constants';

const RECORD_MODEL = 'aiProviderExpansion';
const HISTORY_MODEL = 'aiProviderExpansionHistory';

@Injectable()
export class AiProviderExpansionRepository extends BaseRepository {
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

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'create', { data });
  }

  async findById(id: string, workspaceId?: string | null): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: workspaceId !== undefined
        ? { id, deletedAt: null, OR: [{ workspaceId }, { workspaceId: null }] }
        : { id, deletedAt: null },
    });
  }

  async findByProviderKey(providerKey: string, workspaceId: string | null): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: { providerKey, workspaceId, deletedAt: null },
    });
  }

  /** Prefers a workspace-scoped override over the platform-wide expansion for the same provider. */
  async resolve(providerKey: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    const scoped = await this.findByProviderKey(providerKey, workspaceId);
    if (scoped) return scoped;
    return this.findByProviderKey(providerKey, null);
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findEntries(workspaceId: string, filter: IAiProviderExpansionFilterOptions): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { deletedAt: null, OR: [{ workspaceId }, { workspaceId: null }] };
    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.organizationId !== undefined) where['organizationId'] = filter.organizationId;
    if (filter.rolloutState) where['rolloutState'] = filter.rolloutState;
    if (filter.search) {
      where['providerKey'] = { contains: filter.search, mode: 'insensitive' };
    }

    const sortField = AI_PROVIDER_EXPANSION_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'providerKey'] ?? 'providerKey';
    const orderBy = { [sortField]: filter.sortOrder ?? 'asc' };
    const take = Math.min(filter.limit ?? AI_PROVIDER_EXPANSION_CONSTANTS.DEFAULT_PAGE_SIZE, AI_PROVIDER_EXPANSION_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', { where, orderBy, take, skip }),
      this.call<number>(RECORD_MODEL, 'count', { where }),
    ]);
    return [items, total];
  }

  // ── Expansion History ─────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(HISTORY_MODEL, 'create', { data });
  }

  async findHistory(expansionId: string, limit = 20): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>(HISTORY_MODEL, 'findMany', {
      where: { expansionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
