import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { IUsageBucket, IUsageCorrection, IUsageRecord, IUsageThresholdEvent } from './interfaces';
import { UsageFilterDto } from './dto';

const BUCKET_TRUNC: Record<string, string> = { HOUR: 'hour', DAY: 'day', MONTH: 'month' };

@Injectable()
export class UsageTrackingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Records ──────────────────────────────────────────────────────

  async create(data: Partial<IUsageRecord>): Promise<IUsageRecord> {
    return this.prisma.usageRecord.create({ data: data as any }) as Promise<IUsageRecord>;
  }

  async findById(id: string): Promise<IUsageRecord | null> {
    return this.prisma.usageRecord.findFirst({ where: { id } }) as Promise<IUsageRecord | null>;
  }

  async findByIdempotencyKey(workspaceId: string, idempotencyKey: string): Promise<IUsageRecord | null> {
    return this.prisma.usageRecord.findFirst({ where: { workspaceId, idempotencyKey } }) as Promise<IUsageRecord | null>;
  }

  async markReversed(id: string): Promise<IUsageRecord> {
    return this.prisma.usageRecord.update({ where: { id }, data: { isReversed: true } }) as Promise<IUsageRecord>;
  }

  async findAll(workspaceId: string, filter: UsageFilterDto): Promise<[IUsageRecord[], number]> {
    const where: Record<string, unknown> = { workspaceId };
    if (filter.resourceKey) where.resourceKey = filter.resourceKey;
    if (filter.module) where.module = filter.module;
    if (filter.billingPeriodId) where.billingPeriodId = filter.billingPeriodId;
    if (filter.subscriptionId) where.subscriptionId = filter.subscriptionId;
    if (filter.source) where.source = filter.source;
    if (filter.startDate || filter.endDate) {
      where.occurredAt = {
        ...(filter.startDate ? { gte: new Date(filter.startDate) } : {}),
        ...(filter.endDate ? { lte: new Date(filter.endDate) } : {}),
      };
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;
    const sortBy = filter.sortBy ?? 'occurredAt';
    const sortOrder = filter.sortOrder ?? 'desc';

    const [data, total] = await Promise.all([
      this.prisma.usageRecord.findMany({ where: where as any, skip, take: limit, orderBy: { [sortBy]: sortOrder } }),
      this.prisma.usageRecord.count({ where: where as any }),
    ]);

    return [data as IUsageRecord[], total];
  }

  /** Sum of non-reversed usage quantity within a window — the base figure `getCurrentUsage` layers correction deltas on top of. */
  async sumQuantity(workspaceId: string, resourceKey: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const result = await this.prisma.usageRecord.aggregate({
      where: { workspaceId, resourceKey, isReversed: false, occurredAt: { gte: periodStart, lte: periodEnd } },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async sumAllTimeQuantity(workspaceId: string, resourceKey: string): Promise<number> {
    const result = await this.prisma.usageRecord.aggregate({
      where: { workspaceId, resourceKey, isReversed: false },
      _sum: { quantity: true },
    });
    return result._sum.quantity ?? 0;
  }

  async findLatestUnit(workspaceId: string, resourceKey: string): Promise<string | null> {
    const latest = await this.prisma.usageRecord.findFirst({
      where: { workspaceId, resourceKey },
      orderBy: { occurredAt: 'desc' },
      select: { unit: true },
    });
    return latest?.unit ?? null;
  }

  /** Date-bucketed aggregation over non-reversed records — corrections are not re-bucketed by their own timestamp, only reflected in point-in-time `getCurrentUsage`/`compareToEntitlement` totals. */
  async getBucketedUsage(workspaceId: string, resourceKey: string, bucket: string, startDate: Date, endDate: Date): Promise<IUsageBucket[]> {
    const trunc = BUCKET_TRUNC[bucket] ?? 'day';
    const rows = await this.prisma.$queryRaw<Array<{ bucket_start: Date; total_quantity: number; record_count: bigint }>>(
      Prisma.sql`
        SELECT date_trunc(${trunc}, occurred_at) AS bucket_start,
               COALESCE(SUM(quantity), 0) AS total_quantity,
               COUNT(*) AS record_count
        FROM usage_records
        WHERE workspace_id = ${workspaceId}
          AND resource_key = ${resourceKey}
          AND is_reversed = false
          AND occurred_at BETWEEN ${startDate} AND ${endDate}
        GROUP BY bucket_start
        ORDER BY bucket_start ASC
      `,
    );

    return rows.map((row) => ({ bucketStart: row.bucket_start, totalQuantity: Number(row.total_quantity), recordCount: Number(row.record_count) }));
  }

  // ── Corrections ──────────────────────────────────────────────────

  async createCorrection(data: Partial<IUsageCorrection>): Promise<IUsageCorrection> {
    return this.prisma.usageCorrection.create({ data: data as any }) as Promise<IUsageCorrection>;
  }

  async sumCorrectionDeltas(workspaceId: string, resourceKey: string, periodStart: Date, periodEnd: Date): Promise<number> {
    const originalRecordIds = await this.prisma.usageRecord.findMany({
      where: { workspaceId, resourceKey, occurredAt: { gte: periodStart, lte: periodEnd } },
      select: { id: true },
    });
    if (originalRecordIds.length === 0) return 0;

    const result = await this.prisma.usageCorrection.aggregate({
      where: { workspaceId, originalRecordId: { in: originalRecordIds.map((r) => r.id) } },
      _sum: { quantityDelta: true },
    });
    return result._sum.quantityDelta ?? 0;
  }

  // ── Threshold events ─────────────────────────────────────────────

  async createThresholdEvent(data: Partial<IUsageThresholdEvent>): Promise<IUsageThresholdEvent> {
    return this.prisma.usageThresholdEvent.create({ data: data as any }) as Promise<IUsageThresholdEvent>;
  }

  async findRecentThresholdEvent(workspaceId: string, resourceKey: string, level: string, billingPeriodId: string | null): Promise<IUsageThresholdEvent | null> {
    return this.prisma.usageThresholdEvent.findFirst({
      where: { workspaceId, resourceKey, level: level as any, billingPeriodId },
      orderBy: { notifiedAt: 'desc' },
    }) as Promise<IUsageThresholdEvent | null>;
  }

  // ── Scheduler-callable sweep support ─────────────────────────────

  async findDistinctWorkspaceResourceKeys(since: Date): Promise<Array<{ workspaceId: string; resourceKey: string }>> {
    const rows = await this.prisma.usageRecord.findMany({
      where: { occurredAt: { gte: since } },
      distinct: ['workspaceId', 'resourceKey'],
      select: { workspaceId: true, resourceKey: true },
    });
    return rows;
  }
}
