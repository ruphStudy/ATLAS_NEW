import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { AiConfigScope, AiConfigStatus, IAiProviderConfigFilterOptions } from './interfaces';
import { AI_CONFIG_CONSTANTS } from './constants';

const RECORD_MODEL = 'aiProviderConfigRecord';
const HISTORY_MODEL = 'aiProviderConfigHistory';

@Injectable()
export class AiProviderConfigurationRepository extends BaseRepository {
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

  async createConfig(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'create', { data });
  }

  async findConfigById(id: string, workspaceId?: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        id,
        deletedAt: null,
        ...(workspaceId ? { OR: [{ workspaceId }, { workspaceId: null }] } : {}),
      },
    });
  }

  async findConfigs(
    workspaceId: string,
    filter: IAiProviderConfigFilterOptions,
  ): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(workspaceId, filter);
    const sortField = AI_CONFIG_CONSTANTS.SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };
    const limit = Math.min(filter.limit ?? AI_CONFIG_CONSTANTS.DEFAULT_PAGE_SIZE, AI_CONFIG_CONSTANTS.MAX_PAGE_SIZE);
    const page = filter.page ?? 1;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>(RECORD_MODEL, 'findMany', {
        where,
        orderBy,
        take: limit,
        skip,
      }),
      this.call<number>(RECORD_MODEL, 'count', { where }),
    ]);

    return [items, total];
  }

  /**
   * Finds the published, effective configuration for a single precedence
   * tier. Callers (the resolver) try MODEL, then USE_CASE, then WORKSPACE,
   * then GLOBAL in order and use the first match.
   */
  async findPublishedByScope(params: {
    providerKey: string;
    scope: AiConfigScope;
    workspaceId?: string | null;
    useCase?: string | null;
    modelId?: string | null;
  }): Promise<Record<string, unknown> | null> {
    const now = new Date();
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        scope: params.scope,
        status: AiConfigStatus.PUBLISHED,
        deletedAt: null,
        workspaceId: params.workspaceId ?? null,
        ...(params.useCase !== undefined ? { useCase: params.useCase } : {}),
        ...(params.modelId !== undefined ? { modelId: params.modelId } : {}),
        OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: now } }],
        AND: [{ OR: [{ effectiveTo: null }, { effectiveTo: { gte: now } }] }],
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * Finds an existing non-archived config occupying the same scope slot,
   * used to reject duplicate configurations. Excludes `excludeId` so
   * updates to an existing record don't conflict with themselves.
   */
  async findConflicting(params: {
    providerKey: string;
    scope: AiConfigScope;
    workspaceId?: string | null;
    useCase?: string | null;
    modelId?: string | null;
    excludeId?: string;
  }): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        scope: params.scope,
        workspaceId: params.workspaceId ?? null,
        useCase: params.useCase ?? null,
        modelId: params.modelId ?? null,
        status: { not: AiConfigStatus.ARCHIVED },
        deletedAt: null,
        ...(params.excludeId ? { id: { not: params.excludeId } } : {}),
      },
    });
  }

  async updateConfig(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>(RECORD_MODEL, 'update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async softDeleteConfig(id: string): Promise<void> {
    await this.call<unknown>(RECORD_MODEL, 'updateMany', {
      where: { id, deletedAt: null },
      data: { deletedAt: new Date(), status: AiConfigStatus.ARCHIVED },
    });
  }

  async getNextVersion(params: {
    providerKey: string;
    scope: AiConfigScope;
    workspaceId?: string | null;
    useCase?: string | null;
    modelId?: string | null;
  }): Promise<number> {
    const latest = await this.call<{ version: number } | null>(RECORD_MODEL, 'findFirst', {
      where: {
        providerKey: params.providerKey,
        scope: params.scope,
        workspaceId: params.workspaceId ?? null,
        useCase: params.useCase ?? null,
        modelId: params.modelId ?? null,
        deletedAt: null,
      },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return (latest?.version ?? 0) + 1;
  }

  // ── History ────────────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<void> {
    await this.call<unknown>(HISTORY_MODEL, 'create', { data });
  }

  async findHistory(configId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>(HISTORY_MODEL, 'findMany', {
      where: { configId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findHistoryByVersion(configId: string, version: number): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>(HISTORY_MODEL, 'findFirst', {
      where: { configId, version },
    });
  }

  // ── Internals ─────────────────────────────────────────────

  private buildWhere(workspaceId: string, filter: IAiProviderConfigFilterOptions): Record<string, unknown> {
    const where: Record<string, unknown> = {
      deletedAt: null,
      OR: [{ workspaceId }, { workspaceId: null }],
    };

    if (filter.providerKey) where['providerKey'] = filter.providerKey;
    if (filter.useCase) where['useCase'] = filter.useCase;
    if (filter.modelId) where['modelId'] = filter.modelId;
    if (filter.scope) where['scope'] = filter.scope;
    if (filter.status) where['status'] = filter.status;
    if (filter.search) {
      where['OR'] = [
        ...(Array.isArray(where['OR']) ? (where['OR'] as unknown[]) : []),
        { name: { contains: filter.search, mode: 'insensitive' } },
        { description: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
