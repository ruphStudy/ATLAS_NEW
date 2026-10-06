import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { ApprovalStatus } from './interfaces';
import type { ListingApprovalFilterDto } from './dto';
import { LISTING_APPROVAL_SORT_FIELDS } from './constants';

@Injectable()
export class ListingApprovalRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listingApproval'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'listingApprovalHistory'
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

  async findByListingId(
    listingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.call<Record<string, unknown>[]>('findMany', {
      where: { listingId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async findLatestByListingId(
    listingId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { listingId, workspaceId, deletedAt: null },
      orderBy: { version: 'desc' },
    });
  }

  async getNextVersion(listingId: string, workspaceId: string): Promise<number> {
    const latest = await this.call<{ version: number } | null>('findFirst', {
      where: { listingId, workspaceId },
      orderBy: { version: 'desc' },
      select: { version: true },
    });
    return latest ? latest.version + 1 : 1;
  }

  async findAll(
    workspaceId: string,
    filter: ListingApprovalFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const statuses = filter.status
      ? Array.isArray(filter.status) ? filter.status : [filter.status]
      : undefined;

    const where: Record<string, unknown> = {
      workspaceId,
      deletedAt: null,
      ...(statuses && { status: { in: statuses } }),
      ...(filter.listingId && { listingId: filter.listingId }),
      ...(filter.catalogProductId && { catalogProductId: filter.catalogProductId }),
      ...(filter.reviewedBy && { reviewedBy: filter.reviewedBy }),
    };

    if (filter.search) {
      where['OR'] = [
        { listingId: { contains: filter.search, mode: 'insensitive' } },
        { catalogProductId: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = LISTING_APPROVAL_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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
    const all = await this.call<{ status: ApprovalStatus }[]>('findMany', {
      where: { workspaceId, deletedAt: null },
      select: { status: true },
    });

    const byStatus: Record<string, number> = {};
    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    return {
      total: all.length,
      byStatus,
      pendingCount: byStatus[ApprovalStatus.PENDING_APPROVAL] ?? 0,
      approvedCount: byStatus[ApprovalStatus.APPROVED] ?? 0,
      rejectedCount: byStatus[ApprovalStatus.REJECTED] ?? 0,
      revisionRequiredCount: byStatus[ApprovalStatus.REVISION_REQUIRED] ?? 0,
      readyToPublishCount: byStatus[ApprovalStatus.READY_TO_PUBLISH] ?? 0,
    };
  }

  async findHistory(
    approvalId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { approvalId, workspaceId },
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
