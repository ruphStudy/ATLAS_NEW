import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { QualityInspectionStatus } from './interfaces';
import type { QualityInspectionFilterDto } from './dto';
import { INSPECTION_SORT_FIELDS } from './constants';

@Injectable()
export class QualityInspectionRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get model() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'qualityInspection'
    ] as Record<string, unknown>;
  }

  private get historyModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'qualityInspectionHistory'
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
    const last = await this.call<{ inspectionSequence: number } | null>('findFirst', {
      where: { workspaceId },
      orderBy: { inspectionSequence: 'desc' },
      select: { inspectionSequence: true },
    });
    return last ? last.inspectionSequence + 1 : 1;
  }

  // ── Create ───────────────────────────────────────────────────

  async create(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.call<Record<string, unknown>>('create', { data });
  }

  async createHistoryEvent(data: Record<string, unknown>): Promise<void> {
    await this.callHistory<unknown>('create', { data });
  }

  // ── Read ─────────────────────────────────────────────────────

  async findById(id: string, workspaceId: string): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId, deletedAt: null },
    });
  }

  async findByInspectionNumber(
    inspectionNumber: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.call<Record<string, unknown> | null>('findFirst', {
      where: { inspectionNumber, workspaceId, deletedAt: null },
    });
  }

  async findAll(
    workspaceId: string,
    filter: QualityInspectionFilterDto,
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
      ...(filter.inspectionType && { inspectionType: filter.inspectionType }),
      ...(filter.samplingMethod && { samplingMethod: filter.samplingMethod }),
      ...(filter.shipmentId && { shipmentId: filter.shipmentId }),
      ...(filter.purchaseOrderId && { purchaseOrderId: filter.purchaseOrderId }),
      ...(filter.supplierId && { supplierId: filter.supplierId }),
      ...(filter.inspector && {
        inspector: { contains: filter.inspector, mode: 'insensitive' },
      }),
      ...(filter.dateFrom || filter.dateTo
        ? {
            inspectionDate: {
              ...(filter.dateFrom && { gte: new Date(filter.dateFrom) }),
              ...(filter.dateTo && { lte: new Date(filter.dateTo) }),
            },
          }
        : {}),
    };

    if (filter.search) {
      where['OR'] = [
        { inspectionNumber: { contains: filter.search, mode: 'insensitive' } },
        { inspectorName: { contains: filter.search, mode: 'insensitive' } },
        { notes: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const sortField = INSPECTION_SORT_FIELDS[filter.sortBy ?? 'createdAt'] ?? 'createdAt';
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
    const all = await this.call<{ status: QualityInspectionStatus; qualityScore: number | null }[]>(
      'findMany',
      {
        where: { workspaceId, deletedAt: null },
        select: { status: true, qualityScore: true },
      },
    );

    const byStatus: Record<string, number> = {};
    for (const item of all) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
    }

    const scored = all.filter((i) => i.qualityScore !== null);
    const averageQualityScore =
      scored.length > 0
        ? Math.round(
            scored.reduce((s, i) => s + (i.qualityScore as number), 0) / scored.length,
          )
        : 0;

    const completed = all.filter((i) =>
      [
        QualityInspectionStatus.PASSED,
        QualityInspectionStatus.FAILED,
        QualityInspectionStatus.CONDITIONAL_APPROVAL,
        QualityInspectionStatus.REJECTED,
        QualityInspectionStatus.CLOSED,
      ].includes(i.status),
    );
    const passCount = all.filter((i) =>
      [
        QualityInspectionStatus.PASSED,
        QualityInspectionStatus.CONDITIONAL_APPROVAL,
        QualityInspectionStatus.CLOSED,
      ].includes(i.status),
    ).length;
    const failCount = all.filter((i) =>
      [QualityInspectionStatus.FAILED, QualityInspectionStatus.REJECTED].includes(i.status),
    ).length;

    return {
      total: all.length,
      byStatus,
      averageQualityScore,
      passRate: completed.length > 0 ? Math.round((passCount / completed.length) * 100) : 0,
      failRate: completed.length > 0 ? Math.round((failCount / completed.length) * 100) : 0,
    };
  }

  async findHistory(
    inspectionId: string,
    workspaceId: string,
  ): Promise<Record<string, unknown>[]> {
    return this.callHistory<Record<string, unknown>[]>('findMany', {
      where: { inspectionId, workspaceId },
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

  async softDelete(id: string, workspaceId: string): Promise<void> {
    await this.call<unknown>('update', {
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
