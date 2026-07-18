import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { PurchaseOrderStatus } from './interfaces';
import type { PurchaseOrderFilterDto } from './dto';

@Injectable()
export class PurchaseOrderRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'purchaseOrder'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'purchaseOrderHistory'
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
    const last = await this.call<{ poSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { poSequence: 'desc' },
      select: { poSequence: true },
    });
    return last ? last.poSequence + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async createHistoryEntry(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  // ── Duplicate check ───────────────────────────────────────────

  async findActiveDuplicate(
    workspaceId: string,
    procurementId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: {
        workspaceId,
        procurementId,
        deletedAt: null,
        status: {
          notIn: [PurchaseOrderStatus.CLOSED, PurchaseOrderStatus.CANCELLED],
        },
      },
    });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findLatestByProcurement(procurementId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { procurementId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findAll(
    workspaceId: string,
    filter: PurchaseOrderFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.procurementId && { procurementId: filter.procurementId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.currency && { currency: filter.currency }),
    };

    if (filter.search) {
      where['OR'] = [
        { poNumber: { contains: filter.search, mode: 'insensitive' } },
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
    const statuses = Object.values(PurchaseOrderStatus);
    const counts = await Promise.all(
      statuses.map((s) =>
        this.call<number>('count', { where: { workspaceId, status: s, deletedAt: null } }),
      ),
    );
    return Object.fromEntries(statuses.map((s, i) => [s, counts[i]]));
  }

  async findHistory(purchaseOrderId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { purchaseOrderId, workspaceId },
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
