import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import type { ProductCostFilterDto } from './dto';

@Injectable()
export class ProductCostRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'productCostCalculation'
    ] as Record<string, unknown>;
  }

  private call<T>(method: string, args: unknown): Promise<T> {
    return (this.model[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Sequence ─────────────────────────────────────────────────

  async getNextVersion(workspaceId: string, contextKey: Partial<{ productId: string; opportunityId: string; rfqId: string; supplierId: string }>): Promise<number> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (contextKey.productId) where['productId'] = contextKey.productId;
    if (contextKey.opportunityId) where['opportunityId'] = contextKey.opportunityId;
    if (contextKey.rfqId) where['rfqId'] = contextKey.rfqId;
    if (contextKey.supplierId) where['supplierId'] = contextKey.supplierId;

    const last = await this.call<{ version: number } | null>('findFirst', {
      where,
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

  async findLatestByProduct(productId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { productId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findLatestByRfqSupplier(rfqSupplierId: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { rfqSupplierId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findAll(
    workspaceId: string,
    filter: ProductCostFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = { workspaceId, deletedAt: null };
    if (filter.productId) where['productId'] = filter.productId;
    if (filter.opportunityId) where['opportunityId'] = filter.opportunityId;
    if (filter.rfqId) where['rfqId'] = filter.rfqId;
    if (filter.supplierId) where['supplierId'] = filter.supplierId;
    if (filter.targetCurrency) where['targetCurrency'] = filter.targetCurrency;

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

  async findHistoryByProduct(productId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { productId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findHistoryByRfq(rfqId: string, workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { rfqId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
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
