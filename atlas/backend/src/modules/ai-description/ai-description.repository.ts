import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { AiDescriptionStatus, AiProvider, GenerationTone } from './interfaces';
import type { AiDescriptionFilterDto } from './dto';
import { AI_DESCRIPTION_SORT_FIELDS } from './constants';

@Injectable()
export class AiDescriptionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'aiDescription'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'aiDescriptionHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findLatestByCatalogProductId(
    catalogProductId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { catalogProductId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async getNextVersion(catalogProductId: string, workspaceId: string): Promise<number> {
    const latest = await this.call<{ version: number } | null>('findFirst', {
      where: { catalogProductId, workspaceId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest ? latest.version + 1 : 1;
  }

  async findAll(
    workspaceId: string,
    filter: AiDescriptionFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.provider && { provider: filter.provider }),
      ...(filter.tone && { tone: filter.tone }),
      ...(filter.language && { language: { contains: filter.language, mode: 'insensitive' } }),
    };

    if (filter.search) {
      where['OR'] = [
        { catalogProductId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = AI_DESCRIPTION_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
    const orderBy = { [sortField]: filter.sortOrder ?? 'desc' };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        orderBy,
        skip: filter.skip,
        take: filter.limit,
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async getStats(workspaceId: string): Promise<Record<string, unknown>> {
    const all = await this.call<{
      status: AiDescriptionStatus;
      provider: AiProvider;
      tone: GenerationTone;
      aiQualityScore: number | null;
      tokensUsed: number | null;
      generationCostUsd: number | null;
    }[]>('findMany', {
      where: { workspaceId, deletedAt: null },
      select: {
        status: true,
        provider: true,
        tone: true,
        aiQualityScore: true,
        tokensUsed: true,
        generationCostUsd: true,
      },
    });

    const byStatus: Record<string, number> = {};
    const byProvider: Record<string, number> = {};
    const byTone: Record<string, number> = {};
    let totalTokensUsed = 0;
    let totalCostUsd = 0;

    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byProvider[item.provider] = (byProvider[item.provider] ?? 0) + 1;
      byTone[item.tone] = (byTone[item.tone] ?? 0) + 1;
      totalTokensUsed += item.tokensUsed ?? 0;
      totalCostUsd += item.generationCostUsd ?? 0;
    }

    const scored = all.filter((i) => i.aiQualityScore !== null);
    const averageQualityScore =
      scored.length > 0
        ? Math.round(scored.reduce((s, i) => s + (i.aiQualityScore as number), 0) / scored.length)
        : 0;

    return {
      total: all.length,
      byStatus,
      byProvider,
      byTone,
      averageQualityScore,
      totalTokensUsed,
      totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
    };
  }

  async findHistory(
    descriptionId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { descriptionId, workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(
    id: string,
    workspaceId: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  // ── Delete ───────────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
