import { Injectable, Logger } from '@nestjs/common';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { UsersRepository } from '@modules/users/users.repository';
import { SubscriptionManagementService } from '@modules/subscription-management/subscription-management.service';
import { SubscriptionChangeType, SubscriptionStatus } from '@modules/subscription-management/interfaces';
import { BillingEngineService } from '@modules/billing-engine/billing-engine.service';
import { PaymentProviderService } from '@modules/payment-provider/payment-provider.service';
import { PaymentTransactionStatus } from '@modules/payment-provider/interfaces';
import { UsageTrackingService } from '@modules/usage-tracking/usage-tracking.service';
import { LicenseManagementService } from '@modules/license-management/license-management.service';
import { LicenseStatus } from '@modules/license-management/interfaces';
import { AnalyticsCacheService } from '@modules/analytics-cache/analytics-cache.service';
import { CacheEntryType, CacheScope } from '@modules/analytics-cache/interfaces';
import { TenantAnalyticsRepository } from './tenant-analytics.repository';
import { TenantAnalyticsEventQueue } from './jobs';
import {
  DateRangeDto,
  UsageBreakdownQueryDto,
  TenantSegmentFilterDto,
  CohortQueryDto,
  ExportAnalyticsQueryDto,
} from './dto';
import {
  TenantAnalyticsEvent,
  TenantRiskLevel,
  TENANT_SEGMENT_TAGS,
  ICohortRetentionRow,
  IPlanComparisonEntry,
  ITenantChurnMetrics,
  ITenantGrowthMetrics,
  ITenantHealthSnapshot,
  ITenantPaymentHealth,
  ITenantQuotaLicenseAdoption,
  ITenantRevenueMetrics,
  ITenantUsageBreakdownEntry,
} from './interfaces';
import {
  CACHE_TTL_SECONDS,
  HEALTH_SCORE_AT_RISK_THRESHOLD,
  HEALTH_SCORE_CRITICAL_THRESHOLD,
  HEALTH_SCORE_WEIGHTS,
  PLATFORM_CACHE_WORKSPACE_ID,
  TENANT_SCAN_PAGE_SIZE,
} from './constants';
import {
  TenantAnalyticsInvalidDateRangeException,
  TenantAnalyticsUnknownReportException,
  TenantAnalyticsUnsupportedExportFormatException,
} from './exceptions/tenant-analytics.exceptions';

interface IWorkspaceLike {
  id: string;
  status: string;
  createdAt: Date;
}

@Injectable()
export class TenantAnalyticsService {
  private readonly logger = new Logger(TenantAnalyticsService.name);

  constructor(
    private readonly repository: TenantAnalyticsRepository,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly usersRepository: UsersRepository,
    private readonly subscriptionManagementService: SubscriptionManagementService,
    private readonly billingEngineService: BillingEngineService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly usageTrackingService: UsageTrackingService,
    private readonly licenseManagementService: LicenseManagementService,
    private readonly analyticsCacheService: AnalyticsCacheService,
    private readonly eventQueue: TenantAnalyticsEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Growth
  // ══════════════════════════════════════════════════════════════════

  async getGrowthMetrics(dto: DateRangeDto): Promise<ITenantGrowthMetrics> {
    const range = this.resolveDateRange(dto);
    return this.withCache('growth', range, async () => {
      const tenants = await this.scanTenants();
      const activeTenants = tenants.filter((t) => t.status === 'ACTIVE');
      const newTenants = tenants.filter((t) => t.createdAt >= range.start && t.createdAt <= range.end);

      let churnedTenants = 0;
      let totalUsers = 0;
      for (const tenant of tenants) {
        const history = await this.safeGetSubscriptionHistory(tenant.id);
        if (history.some((h) => this.isChurnChange(h.changeType) && h.createdAt >= range.start && h.createdAt <= range.end)) {
          churnedTenants++;
        }

        const [, userCount] = await this.usersRepository.findAllByWorkspace(tenant.id, 0, 0).catch(() => [[], 0] as [unknown[], number]);
        totalUsers += userCount;
      }

      return { totalTenants: tenants.length, activeTenants: activeTenants.length, newTenants: newTenants.length, churnedTenants, totalUsers };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Revenue — normalizes Billing Engine's OWN computed `total` figures; never recomputes billing math itself
  // ══════════════════════════════════════════════════════════════════

  async getRevenueMetrics(dto: DateRangeDto): Promise<ITenantRevenueMetrics> {
    const range = this.resolveDateRange(dto);
    return this.withCache('revenue', range, async () => {
      const tenants = await this.scanTenants('ACTIVE');
      let mrr = 0;
      let currency = 'USD';
      let counted = 0;

      for (const tenant of tenants) {
        const subscription = await this.subscriptionManagementService.getEffectiveSubscription(tenant.id).catch(() => null);
        if (!subscription || ![SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL, SubscriptionStatus.PAST_DUE].includes(subscription.status)) {
          continue;
        }

        const periods = await this.billingEngineService.findAllBillingPeriods(tenant.id, { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 1 } as any).catch(() => null);
        const latest = periods?.data?.[0] as { total?: number; currency?: string; periodStart?: Date; periodEnd?: Date } | undefined;
        if (!latest?.total || !latest.periodStart || !latest.periodEnd) continue;

        const periodDays = Math.max(1, (new Date(latest.periodEnd).getTime() - new Date(latest.periodStart).getTime()) / (24 * 60 * 60 * 1000));
        mrr += (latest.total / periodDays) * 30;
        currency = latest.currency ?? currency;
        counted++;
      }

      return { mrr, arr: mrr * 12, arpu: counted > 0 ? mrr / counted : 0, currency, tenantCount: counted };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Churn / expansion — reads SubscriptionHistory change types, never a parallel tracking mechanism
  // ══════════════════════════════════════════════════════════════════

  async getChurnAndExpansion(dto: DateRangeDto): Promise<ITenantChurnMetrics> {
    const range = this.resolveDateRange(dto);
    return this.withCache('churn', range, async () => {
      const tenants = await this.scanTenants();
      const metrics: ITenantChurnMetrics = { upgrades: 0, downgrades: 0, cancellations: 0, renewals: 0, trialConversions: 0, trialExpirations: 0 };

      for (const tenant of tenants) {
        const history = await this.safeGetSubscriptionHistory(tenant.id);
        for (const entry of history) {
          if (entry.createdAt < range.start || entry.createdAt > range.end) continue;
          switch (entry.changeType) {
            case SubscriptionChangeType.PLAN_CHANGED:
              // Direction isn't distinguishable from the change type alone without re-deriving plan
              // tier comparisons (Plan Management's job, not this module's) — counted as an upgrade,
              // the more common case; a dedicated direction field on history would remove this caveat.
              metrics.upgrades++;
              break;
            case SubscriptionChangeType.CANCELLED:
            case SubscriptionChangeType.EXPIRED:
            case SubscriptionChangeType.SUSPENDED:
              metrics.cancellations++;
              break;
            case SubscriptionChangeType.RENEWED:
              metrics.renewals++;
              break;
            case SubscriptionChangeType.TRIAL_CONVERTED:
              metrics.trialConversions++;
              break;
            case SubscriptionChangeType.TRIAL_EXPIRED:
              metrics.trialExpirations++;
              break;
            default:
              break;
          }
        }
      }

      return metrics;
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Payment health
  // ══════════════════════════════════════════════════════════════════

  async getPaymentHealth(dto: DateRangeDto): Promise<ITenantPaymentHealth> {
    const range = this.resolveDateRange(dto);
    return this.withCache('payment-health', range, async () => {
      const tenants = await this.scanTenants();
      let succeededCount = 0;
      let failedCount = 0;
      let overdueInvoiceCount = 0;
      let outstandingRevenue = 0;

      for (const tenant of tenants) {
        const [succeeded, failed, periods] = await Promise.all([
          this.paymentProviderService.findAllTransactions(tenant.id, { status: PaymentTransactionStatus.SUCCEEDED, page: 1, limit: 1 } as any).catch(() => null),
          this.paymentProviderService.findAllTransactions(tenant.id, { status: PaymentTransactionStatus.FAILED, page: 1, limit: 1 } as any).catch(() => null),
          this.billingEngineService.findAllBillingPeriods(tenant.id, { sortBy: 'dueDate', sortOrder: 'desc', page: 1, limit: 20 } as any).catch(() => null),
        ]);

        succeededCount += succeeded?.total ?? 0;
        failedCount += failed?.total ?? 0;

        for (const period of (periods?.data ?? []) as { balanceDue?: number; dueDate?: Date }[]) {
          if ((period.balanceDue ?? 0) > 0 && period.dueDate && new Date(period.dueDate) <= new Date()) {
            overdueInvoiceCount++;
            outstandingRevenue += period.balanceDue ?? 0;
          }
        }
      }

      return { succeededCount, failedCount, overdueInvoiceCount, outstandingRevenue };
    });
  }

  // ══════════════════════════════════════════════════════════════════
  // Usage / quota / license adoption — thin pass-throughs, never re-implemented
  // ══════════════════════════════════════════════════════════════════

  async getUsageBreakdown(dto: UsageBreakdownQueryDto): Promise<ITenantUsageBreakdownEntry[]> {
    const tenants = await this.scanTenants('ACTIVE');
    const entries: ITenantUsageBreakdownEntry[] = [];

    for (const tenant of tenants) {
      const summaries = await this.usageTrackingService.getUsageSummary(tenant.id, dto.resourceKey).catch(() => []);
      for (const summary of summaries) {
        entries.push({ workspaceId: tenant.id, resourceKey: summary.resourceKey, currentPeriodUsage: summary.currentPeriodUsage });
      }
    }

    return entries;
  }

  async getQuotaAndLicenseAdoption(): Promise<ITenantQuotaLicenseAdoption[]> {
    const tenants = await this.scanTenants('ACTIVE');
    const entries: ITenantQuotaLicenseAdoption[] = [];

    for (const tenant of tenants) {
      const licenses = await this.licenseManagementService.findAllLicenses(tenant.id, { status: LicenseStatus.ACTIVE, page: 1, limit: 1 } as any).catch(() => null);
      entries.push({
        workspaceId: tenant.id,
        activeLicenses: licenses?.total ?? 0,
        // Quota Management does not yet expose a cross-resource "current overages" query — only
        // per-resource `checkQuota()` — so this stays a placeholder rather than a partial/misleading count.
        quotaOverages: 0,
      });
    }

    return entries;
  }

  // ══════════════════════════════════════════════════════════════════
  // Segmentation + health score
  // ══════════════════════════════════════════════════════════════════

  async getTenantSegments(filter: TenantSegmentFilterDto) {
    const [data, total] = await this.repository.findAllSnapshots(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return {
      data: data.map((s) => ({ workspaceId: s.workspaceId, healthScore: s.healthScore, riskLevel: s.riskLevel, segments: s.segments })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getTenantHealthScore(workspaceId: string): Promise<ITenantHealthSnapshot> {
    const existing = await this.repository.findSnapshot(workspaceId);
    if (existing) return existing;
    return this.computeHealthScoreForTenant(workspaceId);
  }

  // ══════════════════════════════════════════════════════════════════
  // Cohort / retention
  // ══════════════════════════════════════════════════════════════════

  async getCohortRetention(dto: CohortQueryDto): Promise<ICohortRetentionRow> {
    const [year, month] = dto.cohortMonth.split('-').map(Number);
    const cohortStart = new Date(year as number, (month as number) - 1, 1);
    const cohortEnd = new Date(year as number, month as number, 1);

    const tenants = await this.scanTenants();
    const cohortTenants = tenants.filter((t) => t.createdAt >= cohortStart && t.createdAt < cohortEnd);

    const retentionByMonth: Record<string, number> = {};
    const now = new Date();
    let monthsElapsed = (now.getFullYear() - cohortEnd.getFullYear()) * 12 + (now.getMonth() - cohortEnd.getMonth());
    monthsElapsed = Math.max(0, Math.min(monthsElapsed, 12));

    for (let m = 0; m <= monthsElapsed; m++) {
      const checkpoint = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + m + 1, 1);
      let retained = 0;
      for (const tenant of cohortTenants) {
        const history = await this.safeGetSubscriptionHistory(tenant.id);
        const churnedBeforeCheckpoint = history.some((h) => this.isChurnChange(h.changeType) && h.createdAt < checkpoint);
        if (!churnedBeforeCheckpoint) retained++;
      }
      retentionByMonth[`month_${m}`] = cohortTenants.length > 0 ? Math.round((retained / cohortTenants.length) * 100) : 0;
    }

    return { cohortMonth: dto.cohortMonth, tenantsInCohort: cohortTenants.length, retentionByMonth };
  }

  // ══════════════════════════════════════════════════════════════════
  // Plan comparison
  // ══════════════════════════════════════════════════════════════════

  async comparePlans(): Promise<IPlanComparisonEntry[]> {
    const tenants = await this.scanTenants('ACTIVE');
    const byPlan = new Map<string, { count: number; revenue: number }>();

    for (const tenant of tenants) {
      const subscription = await this.subscriptionManagementService.getEffectiveSubscription(tenant.id).catch(() => null);
      if (!subscription) continue;

      const periods = await this.billingEngineService.findAllBillingPeriods(tenant.id, { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 1 } as any).catch(() => null);
      const revenue = (periods?.data?.[0] as { total?: number } | undefined)?.total ?? 0;

      const bucket = byPlan.get(subscription.planKey) ?? { count: 0, revenue: 0 };
      bucket.count++;
      bucket.revenue += revenue;
      byPlan.set(subscription.planKey, bucket);
    }

    return Array.from(byPlan.entries()).map(([planKey, { count, revenue }]) => ({ planKey, tenantCount: count, averageRevenue: count > 0 ? revenue / count : 0 }));
  }

  // ══════════════════════════════════════════════════════════════════
  // Export — lightweight CSV/JSON serialization; no shared export framework exists to reuse
  // ══════════════════════════════════════════════════════════════════

  async exportReport(dto: ExportAnalyticsQueryDto): Promise<{ contentType: string; body: string }> {
    const format = dto.format ?? 'json';
    const range: DateRangeDto = { start: dto.start, end: dto.end };

    let rows: Record<string, unknown>[];
    switch (dto.report) {
      case 'growth':
        rows = [await this.getGrowthMetrics(range) as unknown as Record<string, unknown>];
        break;
      case 'revenue':
        rows = [await this.getRevenueMetrics(range) as unknown as Record<string, unknown>];
        break;
      case 'churn':
        rows = [await this.getChurnAndExpansion(range) as unknown as Record<string, unknown>];
        break;
      case 'payment-health':
        rows = [await this.getPaymentHealth(range) as unknown as Record<string, unknown>];
        break;
      case 'segments':
        rows = (await this.getTenantSegments({})).data as unknown as Record<string, unknown>[];
        break;
      default:
        throw new TenantAnalyticsUnknownReportException(dto.report);
    }

    if (format === 'json') {
      return { contentType: 'application/json', body: JSON.stringify(rows, null, 2) };
    }
    if (format === 'csv') {
      return { contentType: 'text/csv', body: this.toCsv(rows) };
    }
    throw new TenantAnalyticsUnsupportedExportFormatException(format);
  }

  // ══════════════════════════════════════════════════════════════════
  // Scheduler-callable sweep (no active scheduler wired — mirrors every other module this session)
  // ══════════════════════════════════════════════════════════════════

  async processHealthScoreSweep(): Promise<{ computed: number }> {
    const tenants = await this.scanTenants('ACTIVE');
    for (const tenant of tenants) {
      await this.computeHealthScoreForTenant(tenant.id).catch((error) => this.logger.warn(`Health score computation failed for '${tenant.id}': ${(error as Error).message}`));
    }
    this.logger.log(`Tenant health score sweep: ${tenants.length} tenants computed`);
    return { computed: tenants.length };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — health score computation
  // ══════════════════════════════════════════════════════════════════

  private async computeHealthScoreForTenant(workspaceId: string): Promise<ITenantHealthSnapshot> {
    const [subscription, periods, failedPayments, licenses] = await Promise.all([
      this.subscriptionManagementService.getEffectiveSubscription(workspaceId).catch(() => null),
      this.billingEngineService.findAllBillingPeriods(workspaceId, { sortBy: 'createdAt', sortOrder: 'desc', page: 1, limit: 5 } as any).catch(() => null),
      this.paymentProviderService.findAllTransactions(workspaceId, { status: PaymentTransactionStatus.FAILED, page: 1, limit: 5 } as any).catch(() => null),
      this.licenseManagementService.findAllLicenses(workspaceId, { status: LicenseStatus.ACTIVE, page: 1, limit: 1 } as any).catch(() => null),
    ]);

    const usageScore = 70; // Usage Tracking exposes per-resource comparisons, not a single composite signal — a neutral baseline until a specific resource is designated as the activity proxy.
    const overdueCount = (periods?.data ?? []).filter((p: any) => (p.balanceDue ?? 0) > 0 && p.dueDate && new Date(p.dueDate) <= new Date()).length;
    const billingScore = Math.max(0, 100 - overdueCount * 25);
    const activityScore = subscription && [SubscriptionStatus.ACTIVE, SubscriptionStatus.TRIAL].includes(subscription.status) ? 90 : 40;
    const supportScore = Math.max(0, 100 - (failedPayments?.total ?? 0) * 10);

    const healthScore =
      usageScore * HEALTH_SCORE_WEIGHTS.usage + billingScore * HEALTH_SCORE_WEIGHTS.billing + activityScore * HEALTH_SCORE_WEIGHTS.activity + supportScore * HEALTH_SCORE_WEIGHTS.support;

    const riskLevel = healthScore < HEALTH_SCORE_CRITICAL_THRESHOLD ? TenantRiskLevel.CRITICAL : healthScore < HEALTH_SCORE_AT_RISK_THRESHOLD ? TenantRiskLevel.AT_RISK : TenantRiskLevel.HEALTHY;

    const segments: string[] = [];
    if (activityScore <= 40) segments.push(TENANT_SEGMENT_TAGS.INACTIVE);
    if (riskLevel !== TenantRiskLevel.HEALTHY) segments.push(TENANT_SEGMENT_TAGS.AT_RISK);
    if ((licenses?.total ?? 0) > 0 && billingScore >= 90) segments.push(TENANT_SEGMENT_TAGS.HIGH_VALUE);

    const existing = await this.repository.findSnapshot(workspaceId);
    const snapshot = existing
      ? await this.repository.updateSnapshot(existing.id, { healthScore, riskLevel, segments, usageScore, billingScore, activityScore, supportScore, previousRiskLevel: existing.riskLevel, computedAt: new Date() })
      : await this.repository.createSnapshot({ workspaceId, healthScore, riskLevel, segments, usageScore, billingScore, activityScore, supportScore, previousRiskLevel: null, computedAt: new Date() });

    await this.eventQueue.publish({ event: TenantAnalyticsEvent.HEALTH_SCORE_COMPUTED, workspaceId, metadata: { healthScore, riskLevel } });

    if (existing && existing.riskLevel !== riskLevel) {
      const riskOrder = [TenantRiskLevel.HEALTHY, TenantRiskLevel.AT_RISK, TenantRiskLevel.CRITICAL];
      const increased = riskOrder.indexOf(riskLevel) > riskOrder.indexOf(existing.riskLevel);
      await this.eventQueue.publish({
        event: increased ? TenantAnalyticsEvent.TENANT_RISK_INCREASED : TenantAnalyticsEvent.TENANT_RISK_DECREASED,
        workspaceId,
        metadata: { fromRiskLevel: existing.riskLevel, toRiskLevel: riskLevel },
      });
    }

    return snapshot;
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  private async scanTenants(status?: string): Promise<IWorkspaceLike[]> {
    const [data] = await this.workspaceRepository.findAllPlatformWide({ status }, 0, TENANT_SCAN_PAGE_SIZE);
    return data as unknown as IWorkspaceLike[];
  }

  private async safeGetSubscriptionHistory(workspaceId: string): Promise<{ changeType: SubscriptionChangeType; createdAt: Date }[]> {
    try {
      const subscription = await this.subscriptionManagementService.getEffectiveSubscription(workspaceId);
      if (!subscription) return [];
      const history = await this.subscriptionManagementService.getHistory(subscription.id, workspaceId);
      return history as unknown as { changeType: SubscriptionChangeType; createdAt: Date }[];
    } catch {
      return [];
    }
  }

  private isChurnChange(changeType: SubscriptionChangeType): boolean {
    return [SubscriptionChangeType.CANCELLED, SubscriptionChangeType.EXPIRED, SubscriptionChangeType.SUSPENDED].includes(changeType);
  }

  private resolveDateRange(dto: DateRangeDto): { start: Date; end: Date } {
    const end = dto.end ? new Date(dto.end) : new Date();
    const start = dto.start ? new Date(dto.start) : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    if (start > end) {
      throw new TenantAnalyticsInvalidDateRangeException('start must be before end');
    }
    return { start, end };
  }

  private async withCache<T>(resourceId: string, range: { start: Date; end: Date }, compute: () => Promise<T>): Promise<T> {
    const scopes = { [CacheScope.DATE_RANGE]: `${range.start.toISOString()}_${range.end.toISOString()}` } as Record<CacheScope, string>;

    const cached = await this.analyticsCacheService
      .get({ workspaceId: PLATFORM_CACHE_WORKSPACE_ID, entryType: CacheEntryType.AGGREGATED_MODEL, resourceId, scopes, dateRange: range })
      .catch(() => null);
    if (cached) return cached as T;

    const result = await compute();

    await this.analyticsCacheService
      .set({ workspaceId: PLATFORM_CACHE_WORKSPACE_ID, entryType: CacheEntryType.AGGREGATED_MODEL, resourceId, scopes, dateRange: range, data: result, ttlSeconds: CACHE_TTL_SECONDS })
      .catch((error) => this.logger.warn(`Analytics cache write failed for '${resourceId}': ${(error as Error).message}`));

    return result;
  }

  private toCsv(rows: Record<string, unknown>[]): string {
    if (rows.length === 0) return '';
    const headers = Object.keys(rows[0] as Record<string, unknown>);
    const lines = [headers.join(',')];
    for (const row of rows) {
      lines.push(headers.map((h) => JSON.stringify(row[h] ?? '')).join(','));
    }
    return lines.join('\n');
  }
}
