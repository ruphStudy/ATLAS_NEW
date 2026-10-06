import { Injectable } from '@nestjs/common';
import { AiCostBudgetScope } from '@prisma/client';
import { BaseRepository } from '@database/base.repository';
import { PrismaService } from '@database/prisma.service';
import {
  IAiCostPricingConfig,
  IAiCostPricingConfigHistory,
  IAiCostRecord,
  IAiCostBudget,
  IAiCostBudgetAlert,
  AiCostBudgetAlertType,
} from './interfaces';
import {
  PricingConfigFilterDto,
  BudgetFilterDto,
  CostRecordFilterDto,
  CostSummaryGroupByField,
} from './dto';

@Injectable()
export class AiCostTrackingRepository extends BaseRepository {
  constructor(prisma: PrismaService) {
    super(prisma);
  }

  // ── Pricing configs ──────────────────────────────────────────────

  async createPricingConfig(
    data: Partial<IAiCostPricingConfig>,
  ): Promise<IAiCostPricingConfig> {
    return this.prisma.aiCostPricingConfig.create({
      data: data as any,
    }) as Promise<IAiCostPricingConfig>;
  }

  async updatePricingConfig(
    id: string,
    data: Partial<IAiCostPricingConfig>,
  ): Promise<IAiCostPricingConfig> {
    return this.prisma.aiCostPricingConfig.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiCostPricingConfig>;
  }

  async findPricingConfigById(id: string): Promise<IAiCostPricingConfig | null> {
    return this.prisma.aiCostPricingConfig.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiCostPricingConfig | null>;
  }

  async findPricingConfigDuplicate(params: {
    workspaceId?: string;
    providerKey: string;
    modelKey?: string;
    capability?: string;
  }): Promise<IAiCostPricingConfig | null> {
    return this.prisma.aiCostPricingConfig.findFirst({
      where: {
        workspaceId: params.workspaceId || null,
        providerKey: params.providerKey,
        modelKey: params.modelKey || null,
        capability: params.capability || null,
        deletedAt: null,
      },
    }) as Promise<IAiCostPricingConfig | null>;
  }

  async findAllPricingConfigs(
    filter: PricingConfigFilterDto,
  ): Promise<[IAiCostPricingConfig[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {
      OR: [{ workspaceId: null }, { workspaceId: filter.workspaceId }],
      deletedAt: null,
    };

    if (filter.providerKey) where.providerKey = filter.providerKey;
    if (filter.modelKey) where.modelKey = filter.modelKey;
    if (filter.capability) where.capability = filter.capability;
    if (filter.enabled !== undefined) where.enabled = filter.enabled;

    const [data, total] = await Promise.all([
      this.prisma.aiCostPricingConfig.findMany({
        where,
        skip,
        take: limit,
        orderBy: { priority: 'desc' },
      }),
      this.prisma.aiCostPricingConfig.count({ where }),
    ]);

    return [data as IAiCostPricingConfig[], total];
  }

  async findApplicablePricingConfigs(params: {
    workspaceId: string;
    providerKey: string;
    modelKey?: string;
    capability?: string;
    at: Date;
  }): Promise<IAiCostPricingConfig[]> {
    return this.prisma.aiCostPricingConfig.findMany({
      where: {
        enabled: true,
        deletedAt: null,
        providerKey: params.providerKey,
        OR: [{ workspaceId: null }, { workspaceId: params.workspaceId }],
        AND: [
          { OR: [{ modelKey: null }, { modelKey: params.modelKey ?? null }] },
          { OR: [{ capability: null }, { capability: params.capability ?? null }] },
          { OR: [{ effectiveFrom: null }, { effectiveFrom: { lte: params.at } }] },
          { OR: [{ effectiveTo: null }, { effectiveTo: { gte: params.at } }] },
        ],
      },
      orderBy: { priority: 'desc' },
    }) as Promise<IAiCostPricingConfig[]>;
  }

  async deletePricingConfig(id: string): Promise<void> {
    await this.prisma.aiCostPricingConfig.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async createPricingConfigVersion(
    data: Partial<IAiCostPricingConfigHistory>,
  ): Promise<IAiCostPricingConfigHistory> {
    return this.prisma.aiCostPricingConfigHistory.create({
      data: data as any,
    }) as Promise<IAiCostPricingConfigHistory>;
  }

  async findPricingConfigVersions(
    configId: string,
  ): Promise<IAiCostPricingConfigHistory[]> {
    return this.prisma.aiCostPricingConfigHistory.findMany({
      where: { configId },
      orderBy: { version: 'desc' },
    }) as Promise<IAiCostPricingConfigHistory[]>;
  }

  // ── Cost records ─────────────────────────────────────────────────

  async createCostRecord(
    data: Partial<IAiCostRecord>,
  ): Promise<IAiCostRecord> {
    return this.prisma.aiCostRecord.create({
      data: data as any,
    }) as Promise<IAiCostRecord>;
  }

  async findCostRecordById(
    id: string,
    workspaceId: string,
  ): Promise<IAiCostRecord | null> {
    return this.prisma.aiCostRecord.findFirst({
      where: { id, workspaceId },
    }) as Promise<IAiCostRecord | null>;
  }

  async findAllCostRecords(
    filter: CostRecordFilterDto,
  ): Promise<[IAiCostRecord[], number]> {
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

    if (filter.startDate || filter.endDate) {
      where.createdAt = {};
      if (filter.startDate) where.createdAt.gte = new Date(filter.startDate);
      if (filter.endDate) where.createdAt.lte = new Date(filter.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.aiCostRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiCostRecord.count({ where }),
    ]);

    return [data as IAiCostRecord[], total];
  }

  /**
   * Unpaginated read used by ai-usage-tracking's reconciliation pass —
   * matches cost ledger rows against usage ledger rows for the same
   * workspace/date-range by orchestratorRequestId.
   */
  async findCostRecordsInRange(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<IAiCostRecord[]> {
    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    return this.prisma.aiCostRecord.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    }) as Promise<IAiCostRecord[]>;
  }

  async getCostSummary(
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

    const [totals, failedRequests, retriedRequests, fallbackRequests, duplicateAgg] =
      await Promise.all([
        this.prisma.aiCostRecord.aggregate({
          where,
          _sum: {
            finalCost: true,
            estimatedCost: true,
            inputTokens: true,
            outputTokens: true,
            cachedTokens: true,
            imageUnits: true,
            embeddingUnits: true,
            requestCount: true,
          },
          _avg: { latencyMs: true },
        }),
        this.prisma.aiCostRecord.count({ where: { ...where, status: 'FAILED' } }),
        this.prisma.aiCostRecord.count({ where: { ...where, isRetry: true } }),
        this.prisma.aiCostRecord.count({ where: { ...where, isFallback: true } }),
        this.prisma.aiCostRecord.aggregate({
          where: { ...where, isDuplicate: true },
          _sum: { finalCost: true },
        }),
      ]);

    return {
      totalCost: totals._sum.finalCost || 0,
      totalEstimatedCost: totals._sum.estimatedCost || 0,
      totalInputTokens: totals._sum.inputTokens || 0,
      totalOutputTokens: totals._sum.outputTokens || 0,
      totalCachedTokens: totals._sum.cachedTokens || 0,
      totalImageUnits: totals._sum.imageUnits || 0,
      totalEmbeddingUnits: totals._sum.embeddingUnits || 0,
      totalRequests: totals._sum.requestCount || 0,
      failedRequests,
      retriedRequests,
      fallbackRequests,
      duplicateSpend: duplicateAgg._sum.finalCost || 0,
      averageLatencyMs: totals._avg.latencyMs || 0,
    };
  }

  async getCostSummaryGroupedBy(
    workspaceId: string,
    groupBy: CostSummaryGroupByField,
    startDate?: Date,
    endDate?: Date,
  ): Promise<Array<{ key: string | null; totalCost: number; totalTokens: number; requestCount: number }>> {
    const where: any = { workspaceId };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const grouped = await (this.prisma.aiCostRecord as any).groupBy({
      by: [groupBy],
      where,
      _sum: { finalCost: true, inputTokens: true, outputTokens: true, requestCount: true },
    });

    return (grouped as any[]).map((row) => ({
      key: row[groupBy] ?? null,
      totalCost: row._sum.finalCost || 0,
      totalTokens: (row._sum.inputTokens || 0) + (row._sum.outputTokens || 0),
      requestCount: row._sum.requestCount || 0,
    }));
  }

  async getSpendForWindow(params: {
    workspaceId: string;
    feature?: string;
    projectId?: string;
    scope: 'WORKSPACE' | 'FEATURE' | 'PROJECT';
    periodStart: Date;
    periodEnd: Date;
  }): Promise<number> {
    const where: any = {
      workspaceId: params.workspaceId,
      createdAt: { gte: params.periodStart, lte: params.periodEnd },
    };

    if (params.scope === 'FEATURE') where.feature = params.feature;
    if (params.scope === 'PROJECT') where.projectId = params.projectId;

    const agg = await this.prisma.aiCostRecord.aggregate({
      where,
      _sum: { finalCost: true },
    });

    return agg._sum.finalCost || 0;
  }

  // ── Budgets ──────────────────────────────────────────────────────

  async createBudget(data: Partial<IAiCostBudget>): Promise<IAiCostBudget> {
    return this.prisma.aiCostBudget.create({
      data: data as any,
    }) as Promise<IAiCostBudget>;
  }

  async updateBudget(
    id: string,
    data: Partial<IAiCostBudget>,
  ): Promise<IAiCostBudget> {
    return this.prisma.aiCostBudget.update({
      where: { id },
      data: data as any,
    }) as Promise<IAiCostBudget>;
  }

  async findBudgetById(id: string): Promise<IAiCostBudget | null> {
    return this.prisma.aiCostBudget.findFirst({
      where: { id, deletedAt: null },
    }) as Promise<IAiCostBudget | null>;
  }

  async findBudgetByName(
    name: string,
    workspaceId: string,
  ): Promise<IAiCostBudget | null> {
    return this.prisma.aiCostBudget.findFirst({
      where: { name, workspaceId, deletedAt: null },
    }) as Promise<IAiCostBudget | null>;
  }

  async findAllBudgets(
    filter: BudgetFilterDto,
  ): Promise<[IAiCostBudget[], number]> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = { workspaceId: filter.workspaceId, deletedAt: null };
    if (filter.scope) where.scope = filter.scope;
    if (filter.period) where.period = filter.period;

    const [data, total] = await Promise.all([
      this.prisma.aiCostBudget.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.aiCostBudget.count({ where }),
    ]);

    return [data as IAiCostBudget[], total];
  }

  async findApplicableBudgets(params: {
    workspaceId: string;
    feature?: string;
    projectId?: string;
  }): Promise<IAiCostBudget[]> {
    return this.prisma.aiCostBudget.findMany({
      where: {
        workspaceId: params.workspaceId,
        enabled: true,
        deletedAt: null,
        OR: [
          { scope: AiCostBudgetScope.WORKSPACE },
          ...(params.feature
            ? [{ scope: AiCostBudgetScope.FEATURE, feature: params.feature }]
            : []),
          ...(params.projectId
            ? [{ scope: AiCostBudgetScope.PROJECT, projectId: params.projectId }]
            : []),
        ],
      },
    }) as Promise<IAiCostBudget[]>;
  }

  async deleteBudget(id: string): Promise<void> {
    await this.prisma.aiCostBudget.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  // ── Budget alerts ────────────────────────────────────────────────

  async findAlert(
    budgetId: string,
    periodKey: string,
    type: AiCostBudgetAlertType,
  ): Promise<IAiCostBudgetAlert | null> {
    return this.prisma.aiCostBudgetAlert.findFirst({
      where: { budgetId, periodKey, type },
    }) as Promise<IAiCostBudgetAlert | null>;
  }

  async createAlert(
    data: Partial<IAiCostBudgetAlert>,
  ): Promise<IAiCostBudgetAlert> {
    return this.prisma.aiCostBudgetAlert.create({
      data: data as any,
    }) as Promise<IAiCostBudgetAlert>;
  }

  async findAlertsByBudget(budgetId: string): Promise<IAiCostBudgetAlert[]> {
    return this.prisma.aiCostBudgetAlert.findMany({
      where: { budgetId },
      orderBy: { createdAt: 'desc' },
    }) as Promise<IAiCostBudgetAlert[]>;
  }
}
