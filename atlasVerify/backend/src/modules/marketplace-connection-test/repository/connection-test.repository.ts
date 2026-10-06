import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ConnectionTestHistoryFilter } from '../interfaces';
import { MP_CONN_TEST_CONSTANTS } from '../constants';

@Injectable()
export class ConnectionTestRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(m: string, method: string, args: unknown): Promise<T> {
    return ((this.model(m)[method]) as (a: unknown) => Promise<T>)(args);
  }

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call('marketplaceConnectionTestResult', 'create', { data });
  }

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call('marketplaceConnectionTestResult', 'findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByCorrelationId(correlationId: string): Promise<Record<string, unknown> | null> {
    return this.call('marketplaceConnectionTestResult', 'findFirst', {
      where: { correlationId, deletedAt: null },
    });
  }

  async findHistory(
    filter: ConnectionTestHistoryFilter,
  ): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildWhere(filter);
    const take = Math.min(filter.limit ?? MP_CONN_TEST_CONSTANTS.DEFAULT_PAGE_SIZE, MP_CONN_TEST_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;
    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceConnectionTestResult', 'findMany', {
        where, orderBy: { testedAt: 'desc' }, take, skip,
      }),
      this.call<number>('marketplaceConnectionTestResult', 'count', { where }),
    ]);
    return [items, total];
  }

  async softDelete(id: string): Promise<void> {
    await this.call('marketplaceConnectionTestResult', 'update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private buildWhere(filter: ConnectionTestHistoryFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.accountId !== undefined) where['accountId'] = filter.accountId;
    if (filter.success !== undefined && filter.success !== null) where['success'] = filter.success;
    if (filter.fromDate || filter.toDate) {
      where['testedAt'] = {
        ...(filter.fromDate && { gte: filter.fromDate }),
        ...(filter.toDate && { lte: filter.toDate }),
      };
    }
    return where;
  }
}
