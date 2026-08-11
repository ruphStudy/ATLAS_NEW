import { Injectable, Logger } from '@nestjs/common';
import { AiUsageTrackingRepository } from './ai-usage-tracking.repository';
import { AiCostTrackingRepository } from '@modules/ai-cost-tracking/ai-cost-tracking.repository';
import { AiUsageEventQueue } from './jobs';
import {
  RecordAiUsageDto,
  UsageRecordFilterDto,
  UsageSummaryFilterDto,
  UsageBreakdownFilterDto,
  CreateUsageQuotaDto,
  UpdateUsageQuotaDto,
  QuotaFilterDto,
  ReconciliationFilterDto,
  PaginatedUsageRecordResponseDto,
  PaginatedUsageQuotaResponseDto,
  UsageSummaryResponseDto,
  UsageBreakdownBucketResponseDto,
} from './dto';
import {
  IAiUsageRecord,
  IAiUsageQuota,
  IAiUsageQuotaAlert,
  IUsageReconciliationResult,
  IUsageReconciliationMismatch,
  IUsageBucket,
  UsageBucketGranularity,
  AiUsageRecordStatus,
  AiUsageSource,
  AiUsageAlertType,
  AiUsageQuotaUnit,
  AiUsageEvent,
} from './interfaces';
import {
  AiUsageRecordNotFoundException,
  AiUsageQuotaNotFoundException,
  AiUsageQuotaDuplicateException,
} from './exceptions/ai-usage-tracking.exceptions';
import {
  DEFAULT_QUOTA_THRESHOLD_PERCENT,
  DEFAULT_QUOTA_WARNING_THRESHOLD_PERCENT,
  RECONCILIATION_TOKEN_TOLERANCE,
} from './constants';

@Injectable()
export class AiUsageTrackingService {
  private readonly logger = new Logger(AiUsageTrackingService.name);

  constructor(
    private readonly repository: AiUsageTrackingRepository,
    private readonly costRepository: AiCostTrackingRepository,
    private readonly eventQueue: AiUsageEventQueue,
  ) {}

  // ── Usage recording ──────────────────────────────────────────────

  async recordUsage(dto: RecordAiUsageDto): Promise<IAiUsageRecord> {
    const inputTokens = dto.inputTokens ?? 0;
    const outputTokens = dto.outputTokens ?? 0;
    const reasoningTokens = dto.reasoningTokens ?? 0;
    const cachedTokens = dto.cachedTokens ?? 0;
    // Total tokens is never assumed to follow one provider's summation rule —
    // callers that know their provider's semantics should pass totalTokens
    // explicitly; otherwise a generic sum is used as a best-effort default.
    const totalTokens =
      dto.totalTokens ?? inputTokens + outputTokens + reasoningTokens;

    const record = await this.repository.createUsageRecord({
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
      inputTokens,
      outputTokens,
      reasoningTokens,
      cachedTokens,
      totalTokens,
      imageUnits: dto.imageUnits ?? 0,
      embeddingUnits: dto.embeddingUnits ?? 0,
      audioUnits: dto.audioUnits ?? 0,
      toolCalls: dto.toolCalls ?? 0,
      requestCount: dto.requestCount ?? 1,
      retryCount: dto.retryCount ?? 0,
      fallbackCount: dto.fallbackCount ?? 0,
      latencyMs: dto.latencyMs,
      status: dto.status ?? AiUsageRecordStatus.SUCCESS,
      attemptNumber: dto.attemptNumber ?? 1,
      isRetry: dto.isRetry ?? (dto.attemptNumber ?? 1) > 1,
      isFallback: dto.isFallback ?? false,
      source: dto.source ?? AiUsageSource.ESTIMATED,
      providerRequestRef: dto.providerRequestRef,
      providerResponseRef: dto.providerResponseRef,
      providerBillingRef: dto.providerBillingRef,
      costRecordId: dto.costRecordId,
      errorCode: dto.errorCode,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.publish({
      event: AiUsageEvent.USAGE_RECORDED,
      workspaceId: dto.workspaceId,
      usageRecordId: record.id,
      amount: totalTokens,
    });

    await this.checkQuotas(dto.workspaceId, dto.feature, dto.projectId);

    return record;
  }

  async findUsageRecordById(
    id: string,
    workspaceId: string,
  ): Promise<IAiUsageRecord> {
    const record = await this.repository.findUsageRecordById(id, workspaceId);
    if (!record) {
      throw new AiUsageRecordNotFoundException(id);
    }
    return record;
  }

  async findAllUsageRecords(
    filter: UsageRecordFilterDto,
  ): Promise<PaginatedUsageRecordResponseDto> {
    const [data, total] = await this.repository.findAllUsageRecords(filter);
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

  async getUsageSummary(
    filter: UsageSummaryFilterDto,
  ): Promise<UsageSummaryResponseDto> {
    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    const summary = await this.repository.getUsageSummary(
      filter.workspaceId,
      startDate,
      endDate,
    );

    const groups = filter.groupBy
      ? await this.repository.getUsageSummaryGroupedBy(
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

  async getUsageBreakdown(
    filter: UsageBreakdownFilterDto,
  ): Promise<UsageBreakdownBucketResponseDto[]> {
    const startDate = new Date(filter.startDate);
    const endDate = new Date(filter.endDate);

    const records = await this.repository.findUsageRecordsInRange(
      filter.workspaceId,
      startDate,
      endDate,
    );

    const buckets = new Map<string, IUsageBucket>();

    for (const record of records) {
      const key = this.bucketKeyFor(record.createdAt, filter.bucket);
      const bucket = buckets.get(key) ?? {
        bucketKey: key,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        imageUnits: 0,
        embeddingUnits: 0,
        audioUnits: 0,
        toolCalls: 0,
        requestCount: 0,
      };

      bucket.inputTokens += record.inputTokens;
      bucket.outputTokens += record.outputTokens;
      bucket.totalTokens += record.totalTokens;
      bucket.imageUnits += record.imageUnits;
      bucket.embeddingUnits += record.embeddingUnits;
      bucket.audioUnits += record.audioUnits;
      bucket.toolCalls += record.toolCalls;
      bucket.requestCount += record.requestCount;

      buckets.set(key, bucket);
    }

    return Array.from(buckets.values()).sort((a, b) =>
      a.bucketKey.localeCompare(b.bucketKey),
    );
  }

  private bucketKeyFor(at: Date, granularity: UsageBucketGranularity): string {
    const iso = at.toISOString();
    if (granularity === 'HOUR') return iso.slice(0, 13);
    if (granularity === 'DAY') return iso.slice(0, 10);
    return iso.slice(0, 7);
  }

  // ── Reconciliation with AI Cost Tracker ──────────────────────────

  async reconcile(
    filter: ReconciliationFilterDto,
  ): Promise<IUsageReconciliationResult> {
    const startDate = filter.startDate ? new Date(filter.startDate) : undefined;
    const endDate = filter.endDate ? new Date(filter.endDate) : undefined;

    const [usageRecords, costRecords] = await Promise.all([
      this.repository.findUsageRecordsInRange(filter.workspaceId, startDate, endDate),
      this.costRepository.findCostRecordsInRange(filter.workspaceId, startDate, endDate),
    ]);

    const usageByRequestId = new Map<string, IAiUsageRecord>();
    for (const record of usageRecords) {
      if (record.orchestratorRequestId) {
        usageByRequestId.set(record.orchestratorRequestId, record);
      }
    }

    const costByRequestId = new Map<string, { totalTokens: number }>();
    for (const record of costRecords as Array<Record<string, any>>) {
      if (record.orchestratorRequestId) {
        costByRequestId.set(record.orchestratorRequestId, {
          totalTokens:
            (record.inputTokens ?? 0) +
            (record.outputTokens ?? 0) +
            (record.cachedTokens ?? 0),
        });
      }
    }

    const mismatches: IUsageReconciliationMismatch[] = [];
    let matchedCount = 0;

    for (const [requestId, usage] of usageByRequestId) {
      const cost = costByRequestId.get(requestId);
      if (!cost) {
        mismatches.push({
          orchestratorRequestId: requestId,
          reason: 'MISSING_COST_RECORD',
          usageTotalTokens: usage.totalTokens,
        });
        continue;
      }

      const diff = Math.abs(usage.totalTokens - cost.totalTokens);
      if (diff > RECONCILIATION_TOKEN_TOLERANCE) {
        mismatches.push({
          orchestratorRequestId: requestId,
          reason: 'TOKEN_MISMATCH',
          usageTotalTokens: usage.totalTokens,
          costTotalTokens: cost.totalTokens,
        });
        continue;
      }

      matchedCount++;
    }

    for (const requestId of costByRequestId.keys()) {
      if (!usageByRequestId.has(requestId)) {
        mismatches.push({
          orchestratorRequestId: requestId,
          reason: 'MISSING_USAGE_RECORD',
          costTotalTokens: costByRequestId.get(requestId)!.totalTokens,
        });
      }
    }

    const result: IUsageReconciliationResult = {
      workspaceId: filter.workspaceId,
      usageRecordCount: usageRecords.length,
      costRecordCount: costRecords.length,
      matchedCount,
      mismatches,
    };

    await this.eventQueue.publish({
      event: AiUsageEvent.RECONCILIATION_COMPLETED,
      workspaceId: filter.workspaceId,
      metadata: {
        usageRecordCount: result.usageRecordCount,
        costRecordCount: result.costRecordCount,
        mismatchCount: mismatches.length,
      },
    });

    return result;
  }

  // ── Quota checking ───────────────────────────────────────────────

  private getPeriodWindow(
    period: 'HOURLY' | 'DAILY' | 'MONTHLY',
    at: Date,
  ): { key: string; start: Date; end: Date } {
    if (period === 'HOURLY') {
      const key = at.toISOString().slice(0, 13);
      const start = new Date(`${key}:00:00.000Z`);
      const end = new Date(start);
      end.setUTCHours(end.getUTCHours() + 1);
      end.setUTCMilliseconds(-1);
      return { key, start, end };
    }

    if (period === 'DAILY') {
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

  private async checkQuotas(
    workspaceId: string,
    feature?: string,
    projectId?: string,
  ): Promise<void> {
    const quotas = await this.repository.findApplicableQuotas({
      workspaceId,
      feature,
      projectId,
    });

    for (const quota of quotas) {
      try {
        await this.evaluateQuota(quota);
      } catch (error) {
        this.logger.warn(
          `Failed to evaluate usage quota ${quota.id}: ${(error as Error).message}`,
        );
      }
    }
  }

  private async evaluateQuota(quota: IAiUsageQuota): Promise<void> {
    const now = new Date();
    const { key, start, end } = this.getPeriodWindow(quota.period, now);

    const usageAmount = await this.repository.getUsageAmountForWindow({
      workspaceId: quota.workspaceId,
      feature: quota.feature ?? undefined,
      projectId: quota.projectId ?? undefined,
      scope: quota.scope as 'WORKSPACE' | 'FEATURE' | 'PROJECT',
      unit: quota.unit as AiUsageQuotaUnit,
      periodStart: start,
      periodEnd: end,
    });

    const percentUsed = quota.limitAmount > 0 ? (usageAmount / quota.limitAmount) * 100 : 0;
    const thresholdPercent = quota.thresholdPercent ?? DEFAULT_QUOTA_THRESHOLD_PERCENT;
    const warningThresholdPercent =
      quota.warningThresholdPercent ?? DEFAULT_QUOTA_WARNING_THRESHOLD_PERCENT;

    if (percentUsed >= 100) {
      await this.raiseQuotaAlert(
        quota,
        key,
        AiUsageAlertType.EXCEEDED,
        usageAmount,
        AiUsageEvent.QUOTA_EXCEEDED,
      );
      return;
    }

    if (percentUsed >= warningThresholdPercent) {
      await this.raiseQuotaAlert(
        quota,
        key,
        AiUsageAlertType.WARNING,
        usageAmount,
        AiUsageEvent.QUOTA_WARNING,
      );
      return;
    }

    if (percentUsed >= thresholdPercent) {
      await this.raiseQuotaAlert(
        quota,
        key,
        AiUsageAlertType.THRESHOLD,
        usageAmount,
        AiUsageEvent.QUOTA_THRESHOLD,
      );
    }
  }

  private async raiseQuotaAlert(
    quota: IAiUsageQuota,
    periodKey: string,
    type: AiUsageAlertType,
    usageAmount: number,
    event: AiUsageEvent,
  ): Promise<void> {
    const existing = await this.repository.findAlert(quota.id, periodKey, type);
    if (existing) return;

    const alert = await this.repository.createAlert({
      quotaId: quota.id,
      workspaceId: quota.workspaceId,
      periodKey,
      type,
      usageAmount,
      limitAmount: quota.limitAmount,
      metadata: {},
    });

    await this.eventQueue.publish({
      event,
      workspaceId: quota.workspaceId,
      quotaId: quota.id,
      alertId: alert.id,
      amount: usageAmount,
    });
  }

  // ── Quota CRUD ───────────────────────────────────────────────────

  async createQuota(dto: CreateUsageQuotaDto): Promise<IAiUsageQuota> {
    const existing = await this.repository.findQuotaByName(dto.name, dto.workspaceId);
    if (existing) {
      throw new AiUsageQuotaDuplicateException(dto.name);
    }

    const quota = await this.repository.createQuota({
      workspaceId: dto.workspaceId,
      scope: dto.scope,
      period: dto.period,
      unit: dto.unit,
      name: dto.name,
      feature: dto.feature,
      projectId: dto.projectId,
      limitAmount: dto.limitAmount,
      thresholdPercent: dto.thresholdPercent ?? DEFAULT_QUOTA_THRESHOLD_PERCENT,
      warningThresholdPercent:
        dto.warningThresholdPercent ?? DEFAULT_QUOTA_WARNING_THRESHOLD_PERCENT,
      enabled: dto.enabled ?? true,
      metadata: dto.metadata ?? {},
      createdBy: dto.createdBy,
    });

    await this.eventQueue.publish({
      event: AiUsageEvent.QUOTA_CREATED,
      workspaceId: quota.workspaceId,
      quotaId: quota.id,
    });

    return quota;
  }

  async updateQuota(
    id: string,
    dto: UpdateUsageQuotaDto,
  ): Promise<IAiUsageQuota> {
    await this.findQuotaById(id);

    const updated = await this.repository.updateQuota(id, {
      name: dto.name,
      limitAmount: dto.limitAmount,
      thresholdPercent: dto.thresholdPercent,
      warningThresholdPercent: dto.warningThresholdPercent,
      enabled: dto.enabled,
      metadata: dto.metadata,
      updatedBy: dto.updatedBy,
    });

    await this.eventQueue.publish({
      event: AiUsageEvent.QUOTA_UPDATED,
      workspaceId: updated.workspaceId,
      quotaId: updated.id,
    });

    return updated;
  }

  async deleteQuota(id: string): Promise<void> {
    const existing = await this.findQuotaById(id);
    await this.repository.deleteQuota(id);

    await this.eventQueue.publish({
      event: AiUsageEvent.QUOTA_DELETED,
      workspaceId: existing.workspaceId,
      quotaId: id,
    });
  }

  async findQuotaById(id: string): Promise<IAiUsageQuota> {
    const quota = await this.repository.findQuotaById(id);
    if (!quota) {
      throw new AiUsageQuotaNotFoundException(id);
    }
    return quota;
  }

  async findAllQuotas(
    filter: QuotaFilterDto,
  ): Promise<PaginatedUsageQuotaResponseDto> {
    const [data, total] = await this.repository.findAllQuotas(filter);
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

  async getQuotaAlerts(id: string): Promise<IAiUsageQuotaAlert[]> {
    await this.findQuotaById(id);
    return this.repository.findAlertsByQuota(id);
  }
}
