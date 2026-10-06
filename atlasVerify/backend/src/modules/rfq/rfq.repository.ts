import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { RfqFilterDto } from './dto';

@Injectable()
export class RfqRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Model accessors ──────────────────────────────────────────

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)['rfq'] as Record<string, unknown>;
  }

  private get supplierModel() {
    return (this.prisma as unknown as Record<string, unknown>)['rfqSupplier'] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  private callSupplier<T>(method: string, args: unknown): Promise<T> {
    return (this.supplierModel[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── RFQ number sequence ──────────────────────────────────────

  async getNextSequence(workspaceId: string): Promise<number> {
    const last = await this.call<{ rfqSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { rfqSequence: 'desc' },
      select: { rfqSequence: true },
    });
    return last ? last.rfqSequence + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async createRfq(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', {
      data,
      include: { supplierResponses: true },
    });
  }

  async createRfqSupplier(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.callSupplier<Record<string, unknown>>('create', { data });
  }

  async createManyRfqSuppliers(data: Record<string, unknown>[]): Promise<void> {
    await this.callSupplier<unknown>('createMany', { data, skipDuplicates: true });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
      include: { supplierResponses: true },
    });
  }

  async findByNumber(
    rfqNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { rfqNumber, workspaceId, deletedAt: null },
    });
  }

  async findActiveDuplicate(
    workspaceId: string,
    productId?: string | null,
    opportunityId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    const inactiveStatuses = ['EXPIRED', 'CANCELLED', 'CLOSED'];
    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      status: { notIn: inactiveStatuses },
    };
    if (productId) where['productId'] = productId;
    else if (opportunityId) where['opportunityId'] = opportunityId;
    else return null;

    return this.call<Record<string, unknown> | null>('findFirst', { where });
  }

  async findAll(
    workspaceId: string,
    filter: RfqFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'createdAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const where: Record<string, unknown> = { workspaceId, deletedAt: null };

    if (filter.status?.length) where['status'] = { in: filter.status };
    if (filter.productId) where['productId'] = filter.productId;
    if (filter.opportunityId) where['opportunityId'] = filter.opportunityId;

    if (filter.supplierId) {
      where['supplierResponses'] = { some: { supplierId: filter.supplierId } };
    }

    if (filter.search) {
      where['OR'] = [
        { rfqNumber: { contains: filter.search, mode: 'insensitive' } },
        { title: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      (this.model['findMany'] as (a: unknown) => Promise<unknown[]>)({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: { supplierResponses: true },
      }),
      (this.model['count'] as (a: unknown) => Promise<number>)({ where }),
    ]);

    return [items as Record<string, unknown>[], total];
  }

  // ── Expiry ───────────────────────────────────────────────────

  async findExpiredRfqs(): Promise<Record<string, unknown>[]> {
    return (this.model['findMany'] as (a: unknown) => Promise<unknown[]>)({
      where: {
        status: { in: ['SENT', 'PARTIALLY_RESPONDED'] },
        expiresAt: { lt: new Date() },
        deletedAt: null,
      },
    }) as Promise<Record<string, unknown>[]>;
  }

  // ── Update ───────────────────────────────────────────────────

  async updateRfq(id: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
      include: { supplierResponses: true },
    });
  }

  async updateRfqSupplier(
    id: string,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callSupplier<Record<string, unknown>>('update', {
      where: { id },
      data: { ...data, updatedAt: new Date() },
    });
  }

  async findRfqSupplier(
    rfqId: string,
    supplierId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callSupplier<Record<string, unknown> | null>('findFirst', {
      where: { rfqId, supplierId },
    });
  }

  async countResponded(rfqId: string): Promise<{ responded: number; total: number }> {
    const [responded, total] = await Promise.all([
      this.callSupplier<number>('count', {
        where: { rfqId, status: { in: ['ACCEPTED', 'DECLINED', 'COUNTER_OFFERED'] } },
      }),
      this.callSupplier<number>('count', { where: { rfqId } }),
    ]);
    return { responded, total };
  }

  // ── Soft delete ──────────────────────────────────────────────

  async softDelete(id: string): Promise<void> {
    await this.call<void>('update', { where: { id }, data: { deletedAt: new Date() } });
  }

  // ── Statistics ───────────────────────────────────────────────

  async getStats(workspaceId: string): Promise<Record<string, number>> {
    const statuses = ['DRAFT', 'SENT', 'PARTIALLY_RESPONDED', 'RESPONDED', 'EXPIRED', 'CANCELLED', 'CLOSED'];

    const [total, ...counts] = await Promise.all([
      (this.model['count'] as (a: unknown) => Promise<number>)({ where: { workspaceId, deletedAt: null } }),
      ...statuses.map((s) =>
        (this.model['count'] as (a: unknown) => Promise<number>)({
          where: { workspaceId, status: s, deletedAt: null },
        }),
      ),
    ]);

    return statuses.reduce(
      (acc, s, i) => ({ ...acc, [s.toLowerCase()]: counts[i] }),
      { total } as Record<string, number>,
    );
  }
}
