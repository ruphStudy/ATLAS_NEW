import { Injectable } from '@nestjs/common';
import { PrismaService } from '@database/prisma.service';
import { ISearchProvider, ISearchProviderQuery, ISearchProviderResult } from '../interfaces/search-provider.interface';
import { ISearchDocument, SearchMode } from '../interfaces';

/**
 * PostgresSearchProvider — the default `ISearchProvider` implementation,
 * backed entirely by the `SearchDocument` table via Prisma (`contains`/
 * `startsWith`-based matching, the same pattern every other module in this
 * codebase already uses for its own `search` filters). Swappable for a
 * dedicated search engine later by binding a different class to the same
 * `SEARCH_PROVIDER` token — callers never depend on this class directly.
 */
@Injectable()
export class PostgresSearchProvider implements ISearchProvider {
  constructor(private readonly prisma: PrismaService) {}

  async index(doc: Partial<ISearchDocument>): Promise<ISearchDocument> {
    return this.prisma.searchDocument.upsert({
      where: {
        workspaceId_entityType_entityId: {
          workspaceId: doc.workspaceId!,
          entityType: doc.entityType!,
          entityId: doc.entityId!,
        },
      },
      create: doc as any,
      update: { ...doc, indexedAt: new Date() } as any,
    }) as Promise<ISearchDocument>;
  }

  async remove(workspaceId: string, entityType: string, entityId: string): Promise<void> {
    await this.prisma.searchDocument.deleteMany({ where: { workspaceId, entityType, entityId } });
  }

  async query(query: ISearchProviderQuery): Promise<ISearchProviderResult> {
    const where = this.buildWhere(query);
    const [items, total] = await Promise.all([
      this.prisma.searchDocument.findMany({
        where: where as any,
        skip: query.skip,
        take: query.take,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.searchDocument.count({ where: where as any }),
    ]);
    return { items: items as ISearchDocument[], total };
  }

  async facet(field: string, query: ISearchProviderQuery, limit: number): Promise<Array<{ value: string; count: number }>> {
    const where = this.buildWhere(query);
    const rows: Array<Record<string, unknown>> = await (this.prisma.searchDocument as any).groupBy({
      by: [field],
      where,
      _count: { _all: true },
      orderBy: { _count: { [field]: 'desc' } },
      take: limit,
    });

    return rows
      .filter((row) => row[field] !== null && row[field] !== undefined)
      .map((row) => ({
        value: String(row[field]),
        count: (row._count as { _all: number })._all,
      }));
  }

  private buildWhere(query: ISearchProviderQuery): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: query.workspaceId };
    if (query.entityTypes?.length || query.excludeEntityTypes?.length) {
      where.entityType = {
        ...(query.entityTypes?.length ? { in: query.entityTypes } : {}),
        ...(query.excludeEntityTypes?.length ? { notIn: query.excludeEntityTypes } : {}),
      };
    }
    if (query.module) where.module = query.module;
    if (query.tags?.length) where.tags = { hasSome: query.tags };
    if (query.status) where.status = query.status;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.marketplace) where.marketplace = query.marketplace;
    if (query.warehouse) where.warehouse = query.warehouse;
    if (query.country) where.country = query.country;

    if (query.dateFrom || query.dateTo) {
      const updatedAt: Record<string, Date> = {};
      if (query.dateFrom) updatedAt.gte = query.dateFrom;
      if (query.dateTo) updatedAt.lte = query.dateTo;
      where.updatedAt = updatedAt;
    }

    if (query.q) {
      const term = query.q;
      switch (query.mode) {
        case SearchMode.EXACT:
          where.OR = [{ title: term }, { summary: term }];
          break;
        case SearchMode.PREFIX:
          where.OR = [
            { title: { startsWith: term, mode: 'insensitive' } },
            { summary: { startsWith: term, mode: 'insensitive' } },
          ];
          break;
        default:
          where.OR = [
            { title: { contains: term, mode: 'insensitive' } },
            { summary: { contains: term, mode: 'insensitive' } },
            { content: { contains: term, mode: 'insensitive' } },
          ];
      }
    }

    return where;
  }
}
