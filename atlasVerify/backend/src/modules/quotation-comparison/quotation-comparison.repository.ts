import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ComparisonStatus } from './interfaces';
import type { QuotationComparisonFilterDto } from './dto';

@Injectable()
export class QuotationComparisonRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessor ───────────────────────────────────────────

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'quotationComparison'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Sequence ─────────────────────────────────────────────────

  async getNextVersion(rfqId: string, workspaceId: string): Promise<number> {
    const last = await this.call<{ version: number } | null>('findFirst', {
      where: { rfqId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return last ? last.version + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findLatestByRfq(rfqId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { rfqId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findByVersion(
    rfqId: string,
    version: number,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { rfqId, version, workspaceId, deletedAt: null },
    });
  }

  async findAll(
    workspaceId: string,
    filter: QuotationComparisonFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status)
        ? filter.status
        : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(filter.rfqId && { rfqId: filter.rfqId }),
      ...(statuses && { status: { in: statuses } }),
    };

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('findMany', {
        where,
        skip: filter.skip,
        take: filter.limit,
        orderBy: { [filter.sortBy ?? 'createdAt']: filter.sortOrder ?? 'desc' },
      }),
      this.call<number>('count', { where }),
    ]);

    return [items, total];
  }

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    const statuses = Object.values(ComparisonStatus);
    const counts = await Promise.all(
      statuses.map((s) =>
        this.call<number>('count', { where: { workspaceId, status: s, deletedAt: null } }),
      ),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  // ── History list for a single RFQ ────────────────────────────

  async findHistoryByRfq(
    rfqId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { rfqId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data,
    });
  }

  // ── Soft delete ───────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
