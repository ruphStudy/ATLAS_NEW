import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { MarketplaceHealthState, HealthHistoryFilter } from '../interfaces';
import { MP_HEALTH_CONSTANTS } from '../constants';

@Injectable()
export class MarketplaceHealthRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private model(name: string) {
    return (this.prisma as unknown as Record<string, unknown>)[name] as Record<string, unknown>;
  }

  private call<T>(model: string, method: string, args: unknown): Promise<T> {
    const m = this.model(model);
    return (m[method] as (a: unknown) => Promise<T>)(args);
  }

  // ── Health Record (current state) ─────────────────────────

  async upsertRecord(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const { workspaceId, providerKey, accountId = null } = data as {
      workspaceId: string; providerKey: string; accountId: string | null;
    };
    const existing = await this.findRecord(workspaceId, providerKey, accountId);
    if (existing) {
      return this.call<Record<string, unknown>>('marketplaceHealthRecord', 'update', {
        where: { id: (existing as { id: string }).id },
        data: { ...data, updatedAt: new Date() },
      });
    }
    return this.call<Record<string, unknown>>('marketplaceHealthRecord', 'create', {
      data: { ...data, createdAt: new Date(), updatedAt: new Date() },
    });
  }

  async findRecord(
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('marketplaceHealthRecord', 'findFirst', {
      where: {
        workspaceId,
        providerKey: providerKey.toUpperCase(),
        accountId: accountId ?? null,
        deletedAt: null,
      },
    });
  }

  async findAllRecords(workspaceId: string): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('marketplaceHealthRecord', 'findMany', {
      where: { workspaceId, deletedAt: null },
      orderBy: { providerKey: 'asc' },
    });
  }

  async softDeleteRecord(workspaceId: string, providerKey: string, accountId?: string | null): Promise<void> {
    const record = await this.findRecord(workspaceId, providerKey, accountId);
    if (!record) return;
    await this.call<void>('marketplaceHealthRecord', 'update', {
      where: { id: (record as { id: string }).id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Health History ────────────────────────────────────────

  async createHistory(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('marketplaceHealthHistory', 'create', { data });
  }

  async findHistory(filter: HealthHistoryFilter): Promise<[Record<string, unknown>[], number]> {
    const where = this.buildHistoryWhere(filter);
    const take = Math.min(filter.limit ?? MP_HEALTH_CONSTANTS.DEFAULT_PAGE_SIZE, MP_HEALTH_CONSTANTS.MAX_PAGE_SIZE);
    const skip = filter.page ? (filter.page - 1) * take : 0;

    const [items, total] = await Promise.all([
      this.call<Record<string, unknown>[]>('marketplaceHealthHistory', 'findMany', {
        where, orderBy: { checkedAt: 'desc' }, take, skip,
      }),
      this.call<number>('marketplaceHealthHistory', 'count', { where }),
    ]);
    return [items, total];
  }

  private buildHistoryWhere(filter: HealthHistoryFilter): Record<string, unknown> {
    const where: Record<string, unknown> = { workspaceId: filter.workspaceId };
    if (filter.providerKey) where['providerKey'] = filter.providerKey.toUpperCase();
    if (filter.accountId !== undefined) where['accountId'] = filter.accountId;
    if (filter.state) where['healthState'] = filter.state;
    if (filter.fromDate || filter.toDate) {
      where['checkedAt'] = {
        ...(filter.fromDate && { gte: filter.fromDate }),
        ...(filter.toDate && { lte: filter.toDate }),
      };
    }
    return where;
  }

  // ── Audit Log ─────────────────────────────────────────────

  async createAuditLog(data: Record<string, unknown>): Promise<void> {
    await this.call<void>('marketplaceHealthAuditLog', 'create', { data });
  }
}
