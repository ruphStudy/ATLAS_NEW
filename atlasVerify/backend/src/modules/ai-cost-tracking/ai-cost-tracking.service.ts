import { Injectable, Logger } from '@nestjs/common';
import { AiCostTrackingRepository } from './ai-cost-tracking.repository';
import { AiCostEventQueue } from './jobs';
import {
  RecordAiCostDto,
  EstimateAiCostDto,
  CreatePricingConfigDto,
  UpdatePricingConfigDto,
  PricingConfigFilterDto,
  CreateBudgetDto,
  UpdateBudgetDto,
  BudgetFilterDto,
  CostRecordFilterDto,
  CostSummaryFilterDto,
  PaginatedPricingConfigResponseDto,
  PaginatedCostRecordResponseDto,
  PaginatedBudgetResponseDto,
  EstimateCostResponseDto,
  CostSummaryResponseDto,
} from './dto';
import {
  IAiCostPricingConfig,
  IAiCostPricingConfigHistory,
  IAiCostRecord,
  IAiCostBudget,
  IAiCostBudgetAlert,
  IAiCostUsage,
  AiCostRecordStatus,
  AiCostBudgetPeriod,
  AiCostBudgetAlertType,
  AiCostEvent,
} from './interfaces';
import {
  AiCostPricingConfigNotFoundException,
  AiCostPricingConfigDuplicateException,
  AiCostPricingConfigUnresolvedException,
  AiCostBudgetNotFoundException,
  AiCostBudgetDuplicateException,
  AiCostRecordNotFoundException,
} from './exceptions/ai-cost-tracking.exceptions';
import { DEFAULT_BUDGET_WARNING_THRESHOLD_PERCENT, DEFAULT_PRICING_CURRENCY } from './constants';

@Injectable()
export class AiCostTrackingService {
  private readonly logger = new Logger(AiCostTrackingService.name);

  constructor(
    private readonly repository: AiCostTrackingRepository,
    private readonly eventQueue: AiCostEventQueue,
  ) {}

  // ── Pricing resolution + calculation ─────────────────────────────

  async resolvePricingConfig(params: {
    workspaceId: string;
    providerKey: string;
    modelKey?: string;
    capability?: string;
    at?: Date;
  }): Promise<IAiCostPricingConfig> {
    const candidates = await this.repository.findApplicablePricingConfigs({
      workspaceId: params.workspaceId,
      providerKey: params.providerKey,
      modelKey: params.modelKey,
      capability: params.capability,
      at: params.at ?? new Date(),
    });

    if (candidates.length === 0) {
      throw new AiCostPricingConfigUnresolvedException(
        params.providerKey,
        params.modelKey,
      );
    }

    const specificity = (c: IAiCostPricingConfig): number =>
      (c.workspaceId ? 4 : 0) + (c.modelKey ? 2 : 0) + (c.capability ? 1 : 0);

    return candidates.sort((a, b) => {
      const specDiff = specificity(b) - specificity(a);
      if (specDiff !== 0) return specDiff;
      return b.priority - a.priority;
    })[0];
  }

  calculateCost(config: IAiCostPricingConfig, usage: IAiCostUsage): number {
    const inputCost = ((usage.inputTokens ?? 0) / 1000) * (config.inputPricePer1k ?? 0);
    const outputCost = ((usage.outputTokens ?? 0) / 1000) * (config.outputPricePer1k ?? 0);
    const cachedCost =
      ((usage.cachedTokens ?? 0) / 1000) * (config.cachedInputPricePer1k ?? 0);
    const imageCost = (usage.imageUnits ?? 0) * (config.imagePriceUnit ?? 0);
    const embeddingCost =
      ((usage.embeddingUnits ?? 0) / 1000) * (config.embeddingPricePer1k ?? 0);

    return inputCost + outputCost + cachedCost + imageCost + embeddingCost;
  }

  async estimateCost(dto: EstimateAiCostDto): Promise<EstimateCostResponseDto> {
    const config = await this.resolvePricingConfig({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      modelKey: dto.modelKey,
      capability: dto.capability,
    });

    const cost = this.calculateCost(config, {
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
      cachedTokens: dto.cachedTokens,
      imageUnits: dto.imageUnits,
      embeddingUnits: dto.embeddingUnits,
    });

    return {
      cost,
      currency: config.currency,
      pricingConfigId: config.id,
      pricingVersion: config.version,
    };
  }

  // ── Cost recording ───────────────────────────────────────────────

  async recordCost(dto: RecordAiCostDto): Promise<IAiCostRecord> {
    const config = await this.resolvePricingConfig({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      modelKey: dto.modelKey,
      capability: dto.capability,
    });

    const finalUsage: IAiCostUsage = {
      inputTokens: dto.inputTokens ?? 0,
      outputTokens: dto.outputTokens ?? 0,
      cachedTokens: dto.cachedTokens ?? 0,
      imageUnits: dto.imageUnits ?? 0,
      embeddingUnits: dto.embeddingUnits ?? 0,
    };

    const hasEstimateOverride =
      dto.estimatedInputTokens !== undefined ||
      dto.estimatedOutputTokens !== undefined ||
      dto.estimatedCachedTokens !== undefined ||
      dto.estimatedImageUnits !== undefined ||
      dto.estimatedEmbeddingUnits !== undefined;

    const estimatedUsage: IAiCostUsage = hasEstimateOverride
      ? {
          inputTokens: dto.estimatedInputTokens ?? 0,
          outputTokens: dto.estimatedOutputTokens ?? 0,
          cachedTokens: dto.estimatedCachedTokens ?? 0,
          imageUnits: dto.estimatedImageUnits ?? 0,
          embeddingUnits: dto.estimatedEmbeddingUnits ?? 0,
        }
      : finalUsage;

    const estimatedCost = this.calculateCost(config, estimatedUsage);
    const finalCost = this.calculateCost(config, finalUsage);

    const record = await this.repository.createCostRecord({
      workspaceId: dto.workspaceId,
      orchestratorRequestId: dto.orchestratorRequestId,
      agentId: dto.agentId,
      agentExecutionId: dto.agentExecutionId,
      workflowId: dto.workflowId,
      workflowExecutionId: dto.workflowExecutionId,
      jobId: dto.jobId,
      jobExecutionId: dto.jobExecutionId,
      queueJobId: dto.queueJobId,
      providerKey: dto.providerKey,
      modelKey: dto.modelKey,
      capability: dto.capability,
      useCase: dto.useCase,
      feature: dto.feature,
      projectId: dto.projectId,
      userId: dto.userId,
      inputTokens: finalUsage.inputTokens,
      outputTokens: finalUsage.outputTokens,
      cachedTokens: finalUsage.cachedTokens,
      imageUnits: finalUsage.imageUnits,
      embeddingUnits: finalUsage.embeddingUnits,
      requestCount: dto.requestCount ?? 1,
      latencyMs: dto.latencyMs,
      currency: config.currency,
      estimatedCost,
      finalCost,
      pricingConfigId: config.id,
      pricingVersion: config.version,
      status: dto.status ?? AiCostRecordStatus.SUCCESS,
      attemptNumber: dto.attemptNumber ?? 1,
      isRetry: dto.isRetry ?? (dto.attemptNumber ?? 1) > 1,
      isFallback: dto.isFallback ?? false,
      isDuplicate: dto.isDuplicate ?? false,
      providerUsageRef: dto.providerUsageRef,
      providerBillingRef: dto.providerBillingRef,
      errorCode: dto.errorCode,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.publish({
      event: AiCostEvent.COST_RECORDED,
      workspaceId: dto.workspaceId,
      costRecordId: record.id,
      amount: finalCost,
      currency: config.currency,
    });

    await this.checkBudgets(dto.workspaceId, dto.feature, dto.projectId);

    return record;
  }

  async findCostRecordById(
    id: string,
    workspaceId: string,
  ): Promise<IAiCostRecord> {
    const record = await this.repository.findCostRecordById(id, workspaceId);
    if (!record) {
      throw new AiCostRecordNotFoundException(id);
    }
    return record;
  }

  async findAllCostRecords(
    filter: CostRecordFilterDto,
  ): Promise<PaginatedCostRecordResponseDto> {
    const [data, total] = await this.repository.findAllCostRecords(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCostSummary(
    filter: CostSummaryFilterDto,
  ): Promise<CostSummaryResponseDto> {
    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    const summary = await this.repository.getCostSummary(
      filter.workspaceId,
      startDate,
      endDate,
    );

    const groups = filter.groupBy
      ? await this.repository.getCostSummaryGroupedBy(
          filter.workspaceId,
          filter.groupBy,
          startDate,
          endDate,
        )
      : undefined;

    return {
      workspaceId: filter.workspaceId,
      ...summary,
      groups,
    };
  }

  // ── Budget checking ──────────────────────────────────────────────

  private getPeriodWindow(
    period: AiCostBudgetPeriod,
    at: Date,
  ): { key: string; start: Date; end: Date } {
    if (period === AiCostBudgetPeriod.DAILY) {
      const key = at.toISOString().slice(0, 10);
      const start = new Date(`${key}T00:00:00.000Z`);
      const end = new Date(`${key}T23:59:59.999Z`);
      return { key, start, end };
    }

    const key = at.toISOString().slice(0, 7);
    const start = new Date(`${key}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCMilliseconds(-1);
    return { key, start, end };
  }

  private async checkBudgets(
    workspaceId: string,
    feature?: string,
    projectId?: string,
  ): Promise<void> {
    const budgets = await this.repository.findApplicableBudgets({
      workspaceId,
      feature,
      projectId,
    });

    for (const budget of budgets) {
      try {
        await this.evaluateBudget(budget);
      } catch (error) {
        this.logger.warn(
          `Failed to evaluate budget ${budget.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async evaluateBudget(budget: IAiCostBudget): Promise<void> {
    const now = new Date();
    const { key, start, end } = this.getPeriodWindow(budget.period, now);

    const spend = await this.repository.getSpendForWindow({
      workspaceId: budget.workspaceId,
      feature: budget.feature ?? undefined,
      projectId: budget.projectId ?? undefined,
      scope: budget.scope as 'WORKSPACE' | 'FEATURE' | 'PROJECT',
      periodStart: start,
      periodEnd: end,
    });

    const percentUsed = budget.limitAmount > 0 ? (spend / budget.limitAmount) * 100 : 0;
    const warningThreshold =
      budget.warningThresholdPercent ?? DEFAULT_BUDGET_WARNING_THRESHOLD_PERCENT;

    if (percentUsed >= 100) {
      await this.raiseBudgetAlert(
        budget,
        key,
        AiCostBudgetAlertType.EXCEEDED,
        spend,
        AiCostEvent.BUDGET_EXCEEDED,
      );
      return;
    }

    if (percentUsed >= warningThreshold) {
      await this.raiseBudgetAlert(
        budget,
        key,
        AiCostBudgetAlertType.WARNING,
        spend,
        AiCostEvent.BUDGET_WARNING,
      );
    }
  }

  private async raiseBudgetAlert(
    budget: IAiCostBudget,
    periodKey: string,
    type: AiCostBudgetAlertType,
    spendAmount: number,
    event: AiCostEvent,
  ): Promise<void> {
    const existing = await this.repository.findAlert(budget.id, periodKey, type);
    if (existing) return;

    const alert = await this.repository.createAlert({
      budgetId: budget.id,
      workspaceId: budget.workspaceId,
      periodKey,
      type,
      spendAmount,
      limitAmount: budget.limitAmount,
      currency: budget.currency,
      metadata: {},
    });

    await this.eventQueue.publish({
      event,
      workspaceId: budget.workspaceId,
      budgetId: budget.id,
      alertId: alert.id,
      amount: spendAmount,
      currency: budget.currency,
    });
  }

  // ── Pricing config CRUD ──────────────────────────────────────────

  async createPricingConfig(
    dto: CreatePricingConfigDto,
  ): Promise<IAiCostPricingConfig> {
    const existing = await this.repository.findPricingConfigDuplicate({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      modelKey: dto.modelKey,
      capability: dto.capability,
    });

    if (existing) {
      throw new AiCostPricingConfigDuplicateException(dto.providerKey, dto.modelKey);
    }

    const config = await this.repository.createPricingConfig({
      workspaceId: dto.workspaceId,
      providerKey: dto.providerKey,
      modelKey: dto.modelKey,
      capability: dto.capability,
      currency: dto.currency ?? DEFAULT_PRICING_CURRENCY,
      inputPricePer1k: dto.inputPricePer1k,
      outputPricePer1k: dto.outputPricePer1k,
      cachedInputPricePer1k: dto.cachedInputPricePer1k,
      imagePriceUnit: dto.imagePriceUnit,
      embeddingPricePer1k: dto.embeddingPricePer1k,
      enabled: dto.enabled ?? true,
      priority: dto.priority ?? 0,
      version: 1,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.repository.createPricingConfigVersion({
      configId: config.id,
      workspaceId: config.workspaceId,
      providerKey: config.providerKey,
      version: 1,
      snapshot: config as unknown as Record<string, unknown>,
      changedBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiCostEvent.PRICING_CONFIG_CREATED,
      workspaceId: config.workspaceId ?? 'global',
      configId: config.id,
    });

    return config;
  }

  async updatePricingConfig(
    id: string,
    dto: UpdatePricingConfigDto,
  ): Promise<IAiCostPricingConfig> {
    const existing = await this.findPricingConfigById(id);
    const nextVersion = existing.version + 1;

    const updated = await this.repository.updatePricingConfig(id, {
      currency: dto.currency,
      inputPricePer1k: dto.inputPricePer1k,
      outputPricePer1k: dto.outputPricePer1k,
      cachedInputPricePer1k: dto.cachedInputPricePer1k,
      imagePriceUnit: dto.imagePriceUnit,
      embeddingPricePer1k: dto.embeddingPricePer1k,
      enabled: dto.enabled,
      priority: dto.priority,
      effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : undefined,
      effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : undefined,
      metadata: dto.metadata,
      version: nextVersion,
      updatedBy: dto.changedBy,
    });

    await this.repository.createPricingConfigVersion({
      configId: id,
      workspaceId: updated.workspaceId,
      providerKey: updated.providerKey,
      version: nextVersion,
      snapshot: updated as unknown as Record<string, unknown>,
      changeReason: dto.changeReason,
      changedBy: dto.changedBy,
    });

    await this.eventQueue.publish({
      event: AiCostEvent.PRICING_CONFIG_UPDATED,
      workspaceId: updated.workspaceId ?? 'global',
      configId: updated.id,
    });

    return updated;
  }

  async deletePricingConfig(id: string): Promise<void> {
    const existing = await this.findPricingConfigById(id);
    await this.repository.deletePricingConfig(id);

    await this.eventQueue.publish({
      event: AiCostEvent.PRICING_CONFIG_DELETED,
      workspaceId: existing.workspaceId ?? 'global',
      configId: id,
    });
  }

  async findPricingConfigById(id: string): Promise<IAiCostPricingConfig> {
    const config = await this.repository.findPricingConfigById(id);
    if (!config) {
      throw new AiCostPricingConfigNotFoundException(id);
    }
    return config;
  }

  async findAllPricingConfigs(
    filter: PricingConfigFilterDto,
  ): Promise<PaginatedPricingConfigResponseDto> {
    const [data, total] = await this.repository.findAllPricingConfigs(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPricingConfigVersions(
    id: string,
  ): Promise<IAiCostPricingConfigHistory[]> {
    await this.findPricingConfigById(id);
    return this.repository.findPricingConfigVersions(id);
  }

  // ── Budget CRUD ──────────────────────────────────────────────────

  async createBudget(dto: CreateBudgetDto): Promise<IAiCostBudget> {
    const existing = await this.repository.findBudgetByName(dto.name, dto.workspaceId);
    if (existing) {
      throw new AiCostBudgetDuplicateException(dto.name);
    }

    const budget = await this.repository.createBudget({
      workspaceId: dto.workspaceId,
      scope: dto.scope,
      period: dto.period,
      name: dto.name,
      feature: dto.feature,
      projectId: dto.projectId,
      limitAmount: dto.limitAmount,
      currency: dto.currency ?? DEFAULT_PRICING_CURRENCY,
      warningThresholdPercent:
        dto.warningThresholdPercent ?? DEFAULT_BUDGET_WARNING_THRESHOLD_PERCENT,
      enabled: dto.enabled ?? true,
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiCostEvent.BUDGET_CREATED,
      workspaceId: budget.workspaceId,
      budgetId: budget.id,
    });

    return budget;
  }

  async updateBudget(
    id: string,
    dto: UpdateBudgetDto,
  ): Promise<IAiCostBudget> {
    await this.findBudgetById(id);

    const updated = await this.repository.updateBudget(id, {
      name: dto.name,
      limitAmount: dto.limitAmount,
      currency: dto.currency,
      warningThresholdPercent: dto.warningThresholdPercent,
      enabled: dto.enabled,
      metadata: dto.metadata,
      updatedBy: dto.updatedBy,
    });

    await this.eventQueue.publish({
      event: AiCostEvent.BUDGET_UPDATED,
      workspaceId: updated.workspaceId,
      budgetId: updated.id,
    });

    return updated;
  }

  async deleteBudget(id: string): Promise<void> {
    const existing = await this.findBudgetById(id);
    await this.repository.deleteBudget(id);

    await this.eventQueue.publish({
      event: AiCostEvent.BUDGET_DELETED,
      workspaceId: existing.workspaceId,
      budgetId: id,
    });
  }

  async findBudgetById(id: string): Promise<IAiCostBudget> {
    const budget = await this.repository.findBudgetById(id);
    if (!budget) {
      throw new AiCostBudgetNotFoundException(id);
    }
    return budget;
  }

  async findAllBudgets(
    filter: BudgetFilterDto,
  ): Promise<PaginatedBudgetResponseDto> {
    const [data, total] = await this.repository.findAllBudgets(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getBudgetAlerts(id: string): Promise<IAiCostBudgetAlert[]> {
    await this.findBudgetById(id);
    return this.repository.findAlertsByBudget(id);
  }
}
