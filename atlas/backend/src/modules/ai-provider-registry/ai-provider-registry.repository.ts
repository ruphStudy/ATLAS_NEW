import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ProviderRegistrationStatus, IAiProviderRegistryFilterOptions } from './interfaces';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from './constants';

const RECORD_MODEL = 'aiProviderRegistryRecord';

@Injectable()
export class AiProviderRegistryRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Accessors ─────────────────────────────────────────────

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(modelName: string, method: string, args: unknown): Promise<T> {
    const m = this.model(modelName);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── CRUD ──────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'create', { data });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: { id, deletedAt: null, OR: [{ workspaceId }, { workspaceId: null }] },
    });
  }

  async findConflicting(params: {
    providerKey: string;
    workspaceId: string | null;
    excludeId?: string;
  }): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        workspaceId: params.workspaceId,
        status: { not: ProviderRegistrationStatus.ARCHIVED },
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
  }

  /**
   * Exact provider-key lookup, preferring a workspace-specific entry over
   * a global one. Used for direct/preferred resolution and for walking a
   * fallback chain.
   */
  async findByProviderKey(providerKey: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey,
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: { workspaceId: 'desc' },
    });
  }

  async findGlobalByProviderKey(providerKey: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: { providerKey, workspaceId: null, deletedAt: null },
    });
  }

  /**
   * Broad candidate fetch for discovery/resolution — capability, model
   * and region matching is refined in-memory by the caller since those
   * are stored as JSON arrays, not queryable columns under this
   * reflection-based repository.
   */
  async findActiveCandidates(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', {
      where: {
        status: ProviderRegistrationStatus.ACTIVE,
        deletedAt: null,
        OR: [{ workspaceId }, { workspaceId: null }],
      },
      orderBy: [{ workspaceId: 'desc' }, { isDefault: 'desc' }, { priority: 'asc' }],
    });
  }

  async findEntries(
    workspaceId: string,
    filter: IAiProviderRegistryFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(workspaceId, filter);
    const sortField = AI_PROVIDER_REGISTRY_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';

    const all = await this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', {
      where,
      orderBy: { [sortField]: filter.sortOrder ?? 'desc' },
    });

    const refined = this.refineInMemory(all, filter);

    const limit = Math.min(
      filter.limit ?? AI_PROVIDER_REGISTRY_CONSTANTS.DEFAULT_PAGE_SIZE,
      AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PAGE_SIZE,
    );
    const page = filter.page ?? 1;
    const skip = (page - 1) * limit;

    return [refined.slice(skip, skip + limit), refined.length];
  }

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Internals ─────────────────────────────────────────────

  private buildWhere(workspaceId: string, filter: IAiProviderRegistryFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ workspaceId }, { workspaceId: null }],
    };

    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.adapterKey) where['adapterKey'] = filter.adapterKey;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['AND'] = [
        {
          OR: [
            { providerKey: { contains: filter.search, mode: 'insensitive' } },
            { displayName: { contains: filter.search, mode: 'insensitive' } },
          ],
        },
      ];
    }

    return where;
  }

  private refineInMemory(
    rows: Record<string, unknown>[],
    filter: IAiProviderRegistryFilterOptions,
  ): Record<string, unknown>[] {
    return rows.filter((row) => {
      if (filter.capability) {
        const capabilities = (row['capabilities'] as string[] | undefined) ?? [];
        if (!capabilities.includes(filter.capability)) return false;
      }
      if (filter.modelId) {
        const models = (row['supportedModels'] as Array<{ modelId?: string }> | undefined) ?? [];
        if (!models.some((m) => m.modelId === filter.modelId)) return false;
      }
      if (filter.region) {
        const regions = (row['regions'] as string[] | undefined) ?? [];
        if (!regions.includes(filter.region)) return false;
      }
      return true;
    });
  }
}
