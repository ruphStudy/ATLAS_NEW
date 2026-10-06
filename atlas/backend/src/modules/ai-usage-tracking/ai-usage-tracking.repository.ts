import { Injectable } from '@nestjs/common';
import { AiUsageQuotaScope } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiUsageRecord,
  IAiUsageQuota,
  IAiUsageQuotaAlert,
  AiUsageAlertType,
  AiUsageQuotaUnit,
} from './interfaces';
import { UsageRecordFilterDto, QuotaFilterDto, UsageSummaryGroupByField } from './dto';

const QUOTA_UNIT_FIELD: Record<AiUsageQuotaUnit, string> = {
  [AiUsageQuotaUnit.REQUESTS]: 'requestCount',
  [AiUsageQuotaUnit.TOKENS]: 'totalTokens',
  [AiUsageQuotaUnit.IMAGES]: 'imageUnits',
  [AiUsageQuotaUnit.EMBEDDINGS]: 'embeddingUnits',
  [AiUsageQuotaUnit.AUDIO]: 'audioUnits',
  [AiUsageQuotaUnit.TOOL_CALLS]: 'toolCalls',
};

@Injectable()
export class AiUsageTrackingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Usage records ────────────────────────────────────────────────

  async createUsageRecord(
    data: Partial<IAiUsageRecord>,
  ): Promise<IAiUsageRecord> {
    return this.prisma.aiUsageRecord.create({
      data: data as any,
    }) as Promise<IAiUsageRecord>;
  }

  async findUsageRecordById(
    id: string,
    workspaceId: string,
  ): Promise<IAiUsageRecord | null> {
    return this.prisma.aiUsageRecord.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiUsageRecord | null>;
  }

  async findAllUsageRecords(
    filter: UsageRecordFilterDto,
  ): Promise<[IAiUsageRecord[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId };
    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.modelKey) where.modelKey = filter.modelKey;
    if (filter.capability) where.capability = filter.capability;
    if (filter.feature) where.feature = filter.feature;
    if (filter.projectId) where.projectId = filter.projectId;
    if (filter.userId) where.userId = filter.userId;
    if (filter.agentExecutionId) where.agentExecutionId = filter.agentExecutionId;
    if (filter.workflowExecutionId) where.workflowExecutionId = filter.workflowExecutionId;
    if (filter.jobExecutionId) where.jobExecutionId = filter.jobExecutionId;
    if (filter.status) where.status = filter.status;
    if (filter.source) where.source = filter.source;

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.aiUsageRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiUsageRecord.count({ where }),
    ]);

    return [data as IAiUsageRecord[], total];
  }

  async findUsageRecordsInRange(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAiUsageRecord[]> {
    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.aiUsageRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    }) as Promise<IAiUsageRecord[]>;
  }

  async getUsageSummary(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [totals, failedRequests] = await Promise.all([
      this.prisma.aiUsageRecord.aggregate({
        where,
        _sum: {
          inputTokens: true,
          outputTokens: true,
          reasoningTokens: true,
          cachedTokens: true,
          totalTokens: true,
          imageUnits: true,
          embeddingUnits: true,
          audioUnits: true,
          toolCalls: true,
          requestCount: true,
          retryCount: true,
          fallbackCount: true,
        },
        _avg: { latencyMs: true },
      }),
      this.prisma.aiUsageRecord.count({ where: { ...where, status: 'FAILED' } }),
    ]);

    return {
      totalInputTokens: totals._sum.inputTokens || 0,
      totalOutputTokens: totals._sum.outputTokens || 0,
      totalReasoningTokens: totals._sum.reasoningTokens || 0,
      totalCachedTokens: totals._sum.cachedTokens || 0,
      totalTokens: totals._sum.totalTokens || 0,
      totalImageUnits: totals._sum.imageUnits || 0,
      totalEmbeddingUnits: totals._sum.embeddingUnits || 0,
      totalAudioUnits: totals._sum.audioUnits || 0,
      totalToolCalls: totals._sum.toolCalls || 0,
      totalRequests: totals._sum.requestCount || 0,
      totalRetries: totals._sum.retryCount || 0,
      totalFallbacks: totals._sum.fallbackCount || 0,
      failedRequests,
      averageLatencyMs: totals._avg.latencyMs || 0,
    };
  }

  async getUsageSummaryGroupedBy(
    workspaceId: string,
    groupBy: UsageSummaryGroupByField,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ key: string | null; totalTokens: number; requestCount: number }>> {
    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const grouped = await (this.prisma.aiUsageRecord as any).groupBy({
      by: [groupBy],
      where,
      _sum: { totalTokens: true, requestCount: true },
    });

    return (grouped as any[]).map((row) => ({
      key: row[groupBy] ?? null,
      totalTokens: row._sum.totalTokens || 0,
      requestCount: row._sum.requestCount || 0,
    }));
  }

  async getUsageAmountForWindow(params: {
    workspaceId: string;
    feature?: string;
    projectId?: string;
    scope: 'WORKSPACE' | 'FEATURE' | 'PROJECT';
    unit: AiUsageQuotaUnit;
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number> {
    const where: any = {
      workspaceId: params.workspaceId,
      createdAt: { gte: params.periodStart, lte: params.periodEnd },
    };

    if (params.scope === 'FEATURE') where.feature = params.feature;
    if (params.scope === 'PROJECT') where.projectId = params.projectId;

    const field = QUOTA_UNIT_FIELD[params.unit];
    const agg = await this.prisma.aiUsageRecord.aggregate({
      where,
      _sum: { [field]: true } as any,
    });

    return (agg._sum as any)[field] || 0;
  }

  // ── Quotas ───────────────────────────────────────────────────────

  async createQuota(data: Partial<IAiUsageQuota>): Promise<IAiUsageQuota> {
    return this.prisma.aiUsageQuota.create({
      data: data as any,
    }) as Promise<IAiUsageQuota>;
  }

  async updateQuota(
    id: string,
    data: Partial<IAiUsageQuota>,
  ): Promise<IAiUsageQuota> {
    return this.prisma.aiUsageQuota.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiUsageQuota>;
  }

  async findQuotaById(id: string): Promise<IAiUsageQuota | null> {
    return this.prisma.aiUsageQuota.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiUsageQuota | null>;
  }

  async findQuotaByName(
    name: string,
    workspaceId: string,
  ): Promise<IAiUsageQuota | null> {
    return this.prisma.aiUsageQuota.findFirst({
      where: { name, workspaceId, deletedAt: null },
    }) as Promise<IAiUsageQuota | null>;
  }

  async findAllQuotas(
    filter: QuotaFilterDto,
  ): Promise<[IAiUsageQuota[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.scope) where.scope = filter.scope;
    if (filter.period) where.period = filter.period;
    if (filter.unit) where.unit = filter.unit;

    const [data, total] = await Promise.all([
      this.prisma.aiUsageQuota.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiUsageQuota.count({ where }),
    ]);

    return [data as IAiUsageQuota[], total];
  }

  async findApplicableQuotas(params: {
    workspaceId: string;
    feature?: string;
    projectId?: string;
  }): Promise<IAiUsageQuota[]> {
    return this.prisma.aiUsageQuota.findMany({
      where: {
        workspaceId: params.workspaceId,
        enabled: true,
        deletedAt: null,
        OR: [
          { scope: AiUsageQuotaScope.WORKSPACE },
          ...(params.feature
            ? [{ scope: AiUsageQuotaScope.FEATURE, feature: params.feature }]
            : []),
          ...(params.projectId
            ? [{ scope: AiUsageQuotaScope.PROJECT, projectId: params.projectId }]
            : []),
        ],
      },
    }) as Promise<IAiUsageQuota[]>;
  }

  async deleteQuota(id: string): Promise<void> {
    await this.prisma.aiUsageQuota.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Quota alerts ─────────────────────────────────────────────────

  async findAlert(
    quotaId: string,
    periodKey: string,
    type: AiUsageAlertType,
  ): Promise<IAiUsageQuotaAlert | null> {
    return this.prisma.aiUsageQuotaAlert.findFirst({
      where: { quotaId, periodKey, type },
    }) as Promise<IAiUsageQuotaAlert | null>;
  }

  async createAlert(
    data: Partial<IAiUsageQuotaAlert>,
  ): Promise<IAiUsageQuotaAlert> {
    return this.prisma.aiUsageQuotaAlert.create({
      data: data as any,
    }) as Promise<IAiUsageQuotaAlert>;
  }

  async findAlertsByQuota(quotaId: string): Promise<IAiUsageQuotaAlert[]> {
    return this.prisma.aiUsageQuotaAlert.findMany({
      where: { quotaId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiUsageQuotaAlert[]>;
  }
}
