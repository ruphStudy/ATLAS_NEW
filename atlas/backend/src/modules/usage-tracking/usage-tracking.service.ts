import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { PlanManagementService } from '@modules/plan-management/plan-management.service';
import { AiUsageTrackingService } from '@modules/ai-usage-tracking/ai-usage-tracking.service';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { UsageTrackingRepository } from './usage-tracking.repository';
import { UsageTrackingEventQueue } from './jobs';
import {
  RecordUsageDto,
  BatchRecordUsageDto,
  ReverseUsageDto,
  AdjustUsageDto,
  UsageFilterDto,
  UsageBreakdownFilterDto,
  PaginatedUsageRecordResponseDto,
} from './dto';
import {
  IUsageBucket,
  IUsageCorrection,
  IUsageEntitlementComparison,
  IUsageLimitReference,
  IUsageRecord,
  IUsageSummary,
  UsageCorrectionType,
  UsageRecordSource,
  UsageThresholdLevel,
  UsageTrackingEvent,
} from './interfaces';
import { AI_USAGE_RESOURCE_KEY, DEFAULT_FORECAST_WINDOW_DAYS, USAGE_CORRECTION_ROLES, USAGE_TRACKING_MODULE } from './constants';
import {
  UsageAccessDeniedException,
  UsageInvalidDefinitionException,
  UsageRecordAlreadyReversedException,
  UsageRecordNotFoundException,
} from './exceptions/usage-tracking.exceptions';

@Injectable()
export class UsageTrackingService {
  private readonly logger = new Logger(UsageTrackingService.name);

  constructor(
    private readonly repository: UsageTrackingRepository,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly planManagementService: PlanManagementService,
    private readonly aiUsageTrackingService: AiUsageTrackingService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: UsageTrackingEventQueue,
  ) {}

  // ── Recording ────────────────────────────────────────────────────

  async recordUsage(workspaceId: string, userId: string, dto: RecordUsageDto): Promise<IUsageRecord> {
    this.assertNotAiUsage(dto.resourceKey);

    if (dto.idempotencyKey) {
      const existing = await this.repository.findByIdempotencyKey(workspaceId, dto.idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    const record = await this.repository.create({
      workspaceId,
      module: dto.module,
      feature: dto.feature ?? null,
      resourceKey: dto.resourceKey,
      quantity: dto.quantity,
      unit: dto.unit,
      source: dto.source ?? UsageRecordSource.API,
      correlationId: dto.correlationId ?? null,
      billingPeriodId: dto.billingPeriodId ?? null,
      subscriptionId: dto.subscriptionId ?? null,
      idempotencyKey: dto.idempotencyKey ?? null,
      occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
      metadata: dto.metadata ?? {},
      userId,
    });

    await this.publishEvent(UsageTrackingEvent.USAGE_RECORDED, workspaceId, dto.resourceKey, record.id, userId);

    try {
      await this.evaluateThreshold(workspaceId, dto.resourceKey, dto.billingPeriodId);
    } catch (error) {
      this.logger.warn(`Threshold evaluation failed for '${workspaceId}'/'${dto.resourceKey}': ${(error as Error).message}`);
    }

    return record;
  }

  async recordBatch(workspaceId: string, userId: string, dto: BatchRecordUsageDto): Promise<{ recorded: number; skipped: number; errors: string[] }> {
    let recorded = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const item of dto.records) {
      try {
        const before = item.idempotencyKey ? await this.repository.findByIdempotencyKey(workspaceId, item.idempotencyKey) : null;
        await this.recordUsage(workspaceId, userId, { ...item, source: item.source ?? UsageRecordSource.BATCH_IMPORT });
        if (before) skipped += 1;
        else recorded += 1;
      } catch (error) {
        errors.push((error as Error).message);
      }
    }

    return { recorded, skipped, errors };
  }

  // ── Corrections ──────────────────────────────────────────────────

  async reverseUsage(id: string, workspaceId: string, userId: string, userRole: string, dto: ReverseUsageDto): Promise<IUsageCorrection> {
    this.assertCanCorrect(userRole);
    const record = await this.getVisibleOrThrow(id, workspaceId);
    if (record.isReversed) {
      throw new UsageRecordAlreadyReversedException(id);
    }

    const correction = await this.repository.createCorrection({
      workspaceId,
      originalRecordId: id,
      correctionType: UsageCorrectionType.REVERSAL,
      quantityDelta: -record.quantity,
      reason: dto.reason,
      changedBy: userId,
    });
    await this.repository.markReversed(id);

    await this.recordAudit(workspaceId, userId, 'usage-tracking.usage.reversed', AuditActionCategory.UPDATE, id);
    await this.publishEvent(UsageTrackingEvent.USAGE_REVERSED, workspaceId, record.resourceKey, id, userId, { reason: dto.reason });
    return correction;
  }

  async adjustUsage(id: string, workspaceId: string, userId: string, userRole: string, dto: AdjustUsageDto): Promise<IUsageCorrection> {
    this.assertCanCorrect(userRole);
    const record = await this.getVisibleOrThrow(id, workspaceId);

    const correction = await this.repository.createCorrection({
      workspaceId,
      originalRecordId: id,
      correctionType: UsageCorrectionType.ADJUSTMENT,
      quantityDelta: dto.quantityDelta,
      reason: dto.reason,
      changedBy: userId,
    });

    await this.recordAudit(workspaceId, userId, 'usage-tracking.usage.adjusted', AuditActionCategory.UPDATE, id);
    await this.publishEvent(UsageTrackingEvent.USAGE_ADJUSTED, workspaceId, record.resourceKey, id, userId, { quantityDelta: dto.quantityDelta, reason: dto.reason });
    return correction;
  }

  // ── Reads ────────────────────────────────────────────────────────

  async getRecord(id: string, workspaceId: string): Promise<IUsageRecord> {
    return this.getVisibleOrThrow(id, workspaceId);
  }

  async findAllRecords(workspaceId: string, filter: UsageFilterDto): Promise<PaginatedUsageRecordResponseDto> {
    const [data, total] = await this.repository.findAll(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getUsageBreakdown(workspaceId: string, dto: UsageBreakdownFilterDto): Promise<IUsageBucket[]> {
    this.assertNotAiUsage(dto.resourceKey, 'breakdown queries — use AI Usage Tracking\'s own breakdown endpoint');
    return this.repository.getBucketedUsage(workspaceId, dto.resourceKey, dto.bucket, new Date(dto.startDate), new Date(dto.endDate));
  }

  /** Current usage for a resource within a window — defaults to the workspace's active subscription period, falling back to a rolling window when no subscription is resolvable. */
  async getCurrentUsage(workspaceId: string, resourceKey: string, periodStart?: Date, periodEnd?: Date): Promise<number> {
    const { start, end } = periodStart && periodEnd ? { start: periodStart, end: periodEnd } : await this.resolveCurrentPeriod(workspaceId);
    const [base, corrections] = await Promise.all([
      this.repository.sumQuantity(workspaceId, resourceKey, start, end),
      this.repository.sumCorrectionDeltas(workspaceId, resourceKey, start, end),
    ]);
    return Math.max(0, base + corrections);
  }

  async compareToEntitlement(workspaceId: string, resourceKey: string): Promise<IUsageEntitlementComparison> {
    const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null);
    const { start, end } = subscription ? { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd } : await this.resolveCurrentPeriod(workspaceId);

    const currentUsage = await this.getCurrentUsage(workspaceId, resourceKey, start, end);

    let limit: IUsageLimitReference | null = null;
    if (subscription) {
      const snapshot = await this.planManagementService.getEntitlementSnapshot(subscription.planKey).catch(() => null);
      const limitDef = snapshot?.limitsByKey[resourceKey];
      if (limitDef) {
        limit = {
          resourceKey,
          unit: limitDef.unit,
          soft: limitDef.soft,
          hard: limitDef.hard,
          graceThreshold: limitDef.graceThreshold,
          overageRule: limitDef.overageRule,
        };
      }
    }

    const remaining = limit?.hard !== undefined ? limit.hard - currentUsage : limit?.soft !== undefined ? limit.soft - currentUsage : null;
    const overageAmount = limit?.hard !== undefined && currentUsage > limit.hard ? currentUsage - limit.hard : 0;

    let thresholdLevel = UsageThresholdLevel.NONE;
    if (limit?.hard !== undefined && currentUsage >= limit.hard) {
      thresholdLevel = UsageThresholdLevel.HARD;
    } else if (limit?.hard !== undefined && limit.graceThreshold !== undefined && currentUsage >= limit.hard - limit.graceThreshold) {
      thresholdLevel = UsageThresholdLevel.SOFT;
    } else if (limit?.soft !== undefined && currentUsage >= limit.soft) {
      thresholdLevel = UsageThresholdLevel.SOFT;
    }

    const elapsedMs = Date.now() - start.getTime();
    const totalMs = end.getTime() - start.getTime();
    const forecastedUsage = elapsedMs > 0 && totalMs > 0 ? Math.round((currentUsage * (totalMs / elapsedMs)) * 100) / 100 : null;

    const unit = limit?.unit ?? (await this.repository.findLatestUnit(workspaceId, resourceKey)) ?? '';

    return {
      workspaceId,
      resourceKey,
      unit,
      currentUsage,
      limit,
      remaining,
      overageAmount,
      thresholdLevel,
      forecastedUsage,
      periodStart: start,
      periodEnd: end,
    };
  }

  /** The read surface Billing, Quota Management and Tenant Analytics consume — never duplicates AI Usage Tracking's own ledger, only folds its summary in alongside this module's own resource keys. */
  async getUsageSummary(workspaceId: string, resourceKey?: string): Promise<IUsageSummary[]> {
    if (resourceKey) {
      return [await this.buildSummary(workspaceId, resourceKey)];
    }

    const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null);
    const snapshot = subscription ? await this.planManagementService.getEntitlementSnapshot(subscription.planKey).catch(() => null) : null;
    const resourceKeys = new Set<string>([...(snapshot ? Object.keys(snapshot.limitsByKey) : []), AI_USAGE_RESOURCE_KEY]);

    return Promise.all([...resourceKeys].map((key) => this.buildSummary(workspaceId, key)));
  }

  // ── Scheduler-callable sweep (no active scheduler wired — mirrors Billing Engine / Subscription Management's approach) ──

  async processThresholdSweep(): Promise<{ checked: number }> {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const pairs = await this.repository.findDistinctWorkspaceResourceKeys(since);

    for (const pair of pairs) {
      try {
        await this.evaluateThreshold(pair.workspaceId, pair.resourceKey);
      } catch (error) {
        this.logger.warn(`Threshold sweep failed for '${pair.workspaceId}'/'${pair.resourceKey}': ${(error as Error).message}`);
      }
    }

    this.logger.log(`Threshold sweep: checked ${pairs.length} workspace/resource pair(s)`);
    return { checked: pairs.length };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private async buildSummary(workspaceId: string, resourceKey: string): Promise<IUsageSummary> {
    if (resourceKey === AI_USAGE_RESOURCE_KEY) {
      return this.buildAiUsageSummary(workspaceId);
    }

    const comparison = await this.compareToEntitlement(workspaceId, resourceKey);
    const allTimeUsage = await this.repository.sumAllTimeQuantity(workspaceId, resourceKey);

    return {
      workspaceId,
      resourceKey,
      unit: comparison.unit,
      currentPeriodUsage: comparison.currentUsage,
      allTimeUsage,
      comparison,
    };
  }

  /** Delegates entirely to AI Usage Tracking's own summary — never re-derives token counts from a parallel ledger. */
  private async buildAiUsageSummary(workspaceId: string): Promise<IUsageSummary> {
    const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null);
    const periodStart = subscription?.currentPeriodStart;

    const [currentPeriod, allTime] = await Promise.all([
      this.aiUsageTrackingService.getUsageSummary({ workspaceId, startDate: periodStart?.toISOString() }).catch(() => null),
      this.aiUsageTrackingService.getUsageSummary({ workspaceId }).catch(() => null),
    ]);

    return {
      workspaceId,
      resourceKey: AI_USAGE_RESOURCE_KEY,
      unit: 'TOKENS',
      currentPeriodUsage: currentPeriod?.totalTokens ?? 0,
      allTimeUsage: allTime?.totalTokens ?? 0,
      comparison: null,
    };
  }

  private async evaluateThreshold(workspaceId: string, resourceKey: string, billingPeriodId?: string): Promise<void> {
    if (resourceKey === AI_USAGE_RESOURCE_KEY) return;

    const comparison = await this.compareToEntitlement(workspaceId, resourceKey);
    if (comparison.thresholdLevel === UsageThresholdLevel.NONE) return;

    const existing = await this.repository.findRecentThresholdEvent(workspaceId, resourceKey, comparison.thresholdLevel, billingPeriodId ?? null);
    if (existing) return;

    await this.repository.createThresholdEvent({
      workspaceId,
      resourceKey,
      level: comparison.thresholdLevel,
      currentQuantity: comparison.currentUsage,
      limitQuantity: comparison.limit?.hard ?? comparison.limit?.soft ?? 0,
      billingPeriodId: billingPeriodId ?? null,
    });

    const event = comparison.thresholdLevel === UsageThresholdLevel.HARD ? UsageTrackingEvent.LIMIT_EXCEEDED : UsageTrackingEvent.THRESHOLD_WARNING;
    await this.publishEvent(event, workspaceId, resourceKey, undefined, undefined, { currentUsage: comparison.currentUsage, limit: comparison.limit });

    if (comparison.thresholdLevel === UsageThresholdLevel.HARD) {
      await this.recordAudit(workspaceId, 'system', 'usage-tracking.limit_exceeded', AuditActionCategory.UPDATE, resourceKey);
    }
  }

  private async resolveCurrentPeriod(workspaceId: string): Promise<{ start: Date; end: Date }> {
    const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null);
    if (subscription) {
      return { start: subscription.currentPeriodStart, end: subscription.currentPeriodEnd };
    }
    const end = new Date();
    const start = new Date(end.getTime() - DEFAULT_FORECAST_WINDOW_DAYS * 24 * 60 * 60 * 1000);
    return { start, end };
  }

  private assertNotAiUsage(resourceKey: string, contextSuffix = "recording — use AI Usage Tracking's own recordUsage endpoint"): void {
    if (resourceKey === AI_USAGE_RESOURCE_KEY) {
      throw new UsageInvalidDefinitionException(`'${AI_USAGE_RESOURCE_KEY}' is owned by AI Usage Tracking and cannot be written here for ${contextSuffix}`);
    }
  }

  private assertCanCorrect(userRole: string): void {
    if (!USAGE_CORRECTION_ROLES.includes(userRole)) {
      throw new UsageAccessDeniedException();
    }
  }

  private async getVisibleOrThrow(id: string, workspaceId: string): Promise<IUsageRecord> {
    const record = await this.repository.findById(id);
    if (!record || record.workspaceId !== workspaceId) {
      throw new UsageRecordNotFoundException(id);
    }
    return record;
  }

  private async recordAudit(workspaceId: string, actorId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: actorId === 'system' ? ActivityActorType.SYSTEM : ActivityActorType.USER,
      actorId: actorId === 'system' ? undefined : actorId,
      action,
      actionCategory,
      module: USAGE_TRACKING_MODULE,
      entityType: 'UsageRecord',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: UsageTrackingEvent,
    workspaceId: string,
    resourceKey: string,
    recordId?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, resourceKey, recordId, actorId, metadata });
  }
}
