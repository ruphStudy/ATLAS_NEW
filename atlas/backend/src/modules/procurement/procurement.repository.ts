import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ProcurementStatus } from './interfaces';
import type { ProcurementFilterDto } from './dto';

@Injectable()
export class ProcurementRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'procurement'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'procurementHistory'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callHistory<T>(method: string, args: unknown): Promise<T> {
    return (this.historyModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Sequence ─────────────────────────────────────────────────

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<{ procurementSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { procurementSequence: 'desc' },
      select: { procurementSequence: true },
    });
    return last ? last.procurementSequence + 1 : 1;
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

  async findActiveDuplicate(
    workspaceId: string,
    productId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        productId,
        deletedAt: null,
        status: {
          notIn: [ProcurementStatus.COMPLETED, ProcurementStatus.CANCELLED],
        },
      },
    });
  }

  async findAll(
    workspaceId: string,
    filter: ProcurementFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.productId && { productId: filter.productId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.rfqId && { rfqId: filter.rfqId }),
      ...(filter.procurementOwner && { procurementOwner: filter.procurementOwner }),
      ...(filter.currency && { currency: filter.currency }),
    };

    if (filter.search) {
      where['OR'] = [
        { procurementNumber: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

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
    const statuses = Object.values(ProcurementStatus);
    const counts = await Promise.all(
      statuses.map((s) =>
        this.call<number>('count', { where: { workspaceId, status: s, deletedAt: null } }),
      ),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async findHistory(procurementId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { procurementId, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── Update ───────────────────────────────────────────────────

  async update(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', { where: { id }, data });
  }

  // ── Soft delete ───────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
