import { Injectable } from '@nestjs/common';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import { WarehouseAuditLogFilterDto } from './dto';

const AUDIT_LOG_SORT_FIELDS: Record<string, string> = {
  timestamp: 'timestamp',
  actorType: 'actorType',
  actionType: 'actionType',
  outcome: 'outcome',
};

@Injectable()
export class WarehouseAuditRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  private get auditLogModel() {
    return (this.prisma as unknown as Record<string, unknown>)[
      'warehouseAuditLog'
    ] as Record<string, unknown>;
  }

  private callAuditLog<T>(method: string, args: unknown): Promise<T> {
    return (this.auditLogModel[method] as (a: unknown) => Promise<T>)(args);
  }

  async recordAuditLog(
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    return this.callAuditLog<Record<string, unknown>>('create', { data });
  }

  async findAuditLogById(
    id: string,
    workspaceId: string,
  ): Promise<Record<string, unknown> | null> {
    return this.callAuditLog<Record<string, unknown> | null>('findFirst', {
      where: { id, workspaceId },
    });
  }

  async findAllAuditLogs(
    workspaceId: string,
    filter: WarehouseAuditLogFilterDto,
  ): Promise<[Record<string, unknown>[], number]> {
    const where: Record<string, unknown> = {
      workspaceId,
    };

    if (filter.warehouseId) where['warehouseId'] = filter.warehouseId;
    if (filter.actorType) where['actorType'] = filter.actorType;
    if (filter.actorId) where['actorId'] = filter.actorId;
    if (filter.actionType) where['actionType'] = filter.actionType;
    if (filter.entityType) where['entityType'] = filter.entityType;
    if (filter.entityId) where['entityId'] = filter.entityId;
    if (filter.outcome) where['outcome'] = filter.outcome;
    if (filter.correlationId) where['correlationId'] = filter.correlationId;
    if (filter.requestId) where['requestId'] = filter.requestId;
    if (filter.jobId) where['jobId'] = filter.jobId;
    if (filter.barcodeId) where['barcodeId'] = filter.barcodeId;
    if (filter.module) where['module'] = filter.module;
    if (filter.operation) where['operation'] = filter.operation;
    if (filter.suspicious !== undefined) where['suspicious'] = filter.suspicious;

    if (filter.startDate || filter.endDate) {
      where['timestamp'] = {};
      if (filter.startDate)
        (where['timestamp'] as Record<string, unknown>)['gte'] = new Date(
          filter.startDate,
        );
      if (filter.endDate)
        (where['timestamp'] as Record<string, unknown>)['lte'] = new Date(
          filter.endDate,
        );
    }

    if (filter.search) {
      where['OR'] = [
        { actorName: { contains: filter.search, mode: 'insensitive' } },
        { actionDescription: { contains: filter.search, mode: 'insensitive' } },
        { entityReference: { contains: filter.search, mode: 'insensitive' } },
        { reason: { contains: filter.search, mode: 'insensitive' } },
      ];
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const skip = (page - 1) * limit;

    const sortBy =
      filter.sortBy && AUDIT_LOG_SORT_FIELDS[filter.sortBy]
        ? AUDIT_LOG_SORT_FIELDS[filter.sortBy]
        : 'timestamp';
    const sortOrder = filter.sortOrder === 'asc' ? 'asc' : 'desc';

    const [data, total] = await Promise.all([
      this.callAuditLog<Record<string, unknown>[]>('findMany', {
        where,
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: limit,
      }),
      this.callAuditLog<number>('count', { where }),
    ]);

    return [data, total];
  }

  async findEntityHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
    limit?: number,
  ): Promise<Record<string, unknown>[]> {
    return this.callAuditLog<Record<string, unknown>[]>('findMany', {
      where: {
        workspaceId,
        entityType,
        entityId,
      },
      orderBy: { timestamp: 'desc' },
      take: limit ?? 100,
    });
  }

  async findSuspiciousActivities(
    workspaceId: string,
    warehouseId?: string,
    limit?: number,
  ): Promise<Record<string, unknown>[]> {
    const where: Record<string, unknown> = {
      workspaceId,
      suspicious: true,
    };

    if (warehouseId) where['warehouseId'] = warehouseId;

    return this.callAuditLog<Record<string, unknown>[]>('findMany', {
      where,
      orderBy: { timestamp: 'desc' },
      take: limit ?? 100,
    });
  }

  async getAuditStatistics(
    workspaceId: string,
    warehouseId?: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<{
    totalAudits: number;
    byAction: Record<string, number>;
    byOutcome: Record<string, number>;
    byActor: Record<string, number>;
    suspiciousCount: number;
  }> {
    const where: Record<string, unknown> = { workspaceId };

    if (warehouseId) where['warehouseId'] = warehouseId;

    if (startDate || endDate) {
      where['timestamp'] = {};
      if (startDate)
        (where['timestamp'] as Record<string, unknown>)['gte'] = startDate;
      if (endDate) (where['timestamp'] as Record<string, unknown>)['lte'] = endDate;
    }

    const [
      totalAudits,
      byActionRaw,
      byOutcomeRaw,
      byActorRaw,
      suspiciousCount,
    ] = await Promise.all([
      this.callAuditLog<number>('count', { where }),
      this.callAuditLog<Array<{ actionType: string; _count: number }>>(
        'groupBy',
        {
          by: ['actionType'],
          where,
          _count: true,
        },
      ),
      this.callAuditLog<Array<{ outcome: string; _count: number }>>('groupBy', {
        by: ['outcome'],
        where,
        _count: true,
      }),
      this.callAuditLog<Array<{ actorType: string; _count: number }>>('groupBy', {
        by: ['actorType'],
        where,
        _count: true,
      }),
      this.callAuditLog<number>('count', {
        where: { ...where, suspicious: true },
      }),
    ]);

    const byAction: Record<string, number> = {};
    (byActionRaw as Array<{ actionType: string; _count: { _all: number } }>).forEach(
      (item) => {
        byAction[item.actionType] = item._count._all;
      },
    );

    const byOutcome: Record<string, number> = {};
    (byOutcomeRaw as Array<{ outcome: string; _count: { _all: number } }>).forEach(
      (item) => {
        byOutcome[item.outcome] = item._count._all;
      },
    );

    const byActor: Record<string, number> = {};
    (byActorRaw as Array<{ actorType: string; _count: { _all: number } }>).forEach(
      (item) => {
        byActor[item.actorType] = item._count._all;
      },
    );

    return {
      totalAudits,
      byAction,
      byOutcome,
      byActor,
      suspiciousCount,
    };
  }
}
