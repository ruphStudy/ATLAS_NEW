import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityOutcome } from '@modules/audit-logs/interfaces';
import { SaasAdministrationService } from '@modules/saas-administration/saas-administration.service';
import { PluginFrameworkService } from '@modules/plugin-framework/plugin-framework.service';
import { PluginActivationStatus } from '@modules/plugin-framework/interfaces';
import { WebhookFrameworkService } from '@modules/webhook-framework/webhook-framework.service';
import { WebhookHealthStatus } from '@modules/webhook-framework/interfaces';
import { IModuleHealthThresholds, ISaasHealthIssue, SaasHealthIssueTag, SaasHealthModuleKey, SaasHealthStatus } from './interfaces';
import {
  AUDIT_FAILURE_WINDOW_MINUTES,
  DELAYED_JOB_AGE_WARNING_MS,
  MONITORED_MODULE_AUDIT_MODULE_MAP,
  REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD,
  SAAS_MONITORING_INTERNAL_ROLE,
} from './constants';
import { sanitizeSummary } from './sanitize.util';

export interface IRawHealthSignals {
  queueBacklog: number;
  queueFailedCount: number;
  queueActiveCount: number;
  queuePaused: boolean;
  oldestWaitingJobAgeMs: number | null;
  auditFailureCount: number;
}

export interface IComputedHealth {
  status: SaasHealthStatus;
  issues: ISaasHealthIssue[];
  safeSummary: string;
}

/**
 * SaasMonitoringSignalService — pure signal gathering + status computation.
 * Reads only already-generic infrastructure (BullMQ job counts on each
 * monitored module's own queue, and Audit Logs' existing `findAll()` for a
 * windowed failure count) for the primary signal — mirrors Operations
 * Health's monitor service exactly. The only business-specific reads are a
 * SMALL, deliberate overlay of already-exported, read-only aggregate
 * methods (never a monitored module's repository, and never recomputed
 * business logic): `SaasAdministrationService.getTenantOverview()` for
 * payment-failure/overdue-billing signals, `PluginFrameworkService`'s own
 * QUARANTINED activation count, and `WebhookFrameworkService`'s own
 * UNHEALTHY endpoint count — each is a metric the owning module already
 * computes and exposes, never duplicated here.
 */
@Injectable()
export class SaasMonitoringSignalService {
  private readonly queuesByModule: Record<SaasHealthModuleKey, Queue>;

  constructor(
    private readonly auditLogsService: AuditLogsService,
    private readonly saasAdministrationService: SaasAdministrationService,
    private readonly pluginFrameworkService: PluginFrameworkService,
    private readonly webhookFrameworkService: WebhookFrameworkService,
    @InjectQueue(QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS) subscriptionManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.BILLING_ENGINE_EVENTS) billingEngineQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PAYMENT_PROVIDER_EVENTS) paymentProviderQueue: Queue,
    @InjectQueue(QUEUE_NAMES.USAGE_TRACKING_EVENTS) usageTrackingQueue: Queue,
    @InjectQueue(QUEUE_NAMES.QUOTA_MANAGEMENT_EVENTS) quotaManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.FEATURE_FLAGS_EVENTS) featureFlagsQueue: Queue,
    @InjectQueue(QUEUE_NAMES.LICENSE_MANAGEMENT_EVENTS) licenseManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.API_KEY_MANAGEMENT_EVENTS) apiKeyManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.OAUTH_MANAGEMENT_EVENTS) oauthManagementQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SSO_FRAMEWORK_EVENTS) ssoFrameworkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.WEBHOOK_FRAMEWORK_EVENTS) webhookFrameworkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.APP_STORE_EVENTS) appStoreQueue: Queue,
    @InjectQueue(QUEUE_NAMES.PLUGIN_FRAMEWORK_EVENTS) pluginFrameworkQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS) saasAdministrationQueue: Queue,
    @InjectQueue(QUEUE_NAMES.SAAS_AUDIT_EVENTS) saasAuditQueue: Queue,
  ) {
    this.queuesByModule = {
      [SaasHealthModuleKey.SUBSCRIPTION_MANAGEMENT]: subscriptionManagementQueue,
      [SaasHealthModuleKey.BILLING_ENGINE]: billingEngineQueue,
      [SaasHealthModuleKey.PAYMENT_PROVIDER]: paymentProviderQueue,
      [SaasHealthModuleKey.USAGE_TRACKING]: usageTrackingQueue,
      [SaasHealthModuleKey.QUOTA_MANAGEMENT]: quotaManagementQueue,
      [SaasHealthModuleKey.FEATURE_FLAGS]: featureFlagsQueue,
      [SaasHealthModuleKey.LICENSE_MANAGEMENT]: licenseManagementQueue,
      [SaasHealthModuleKey.API_KEY_MANAGEMENT]: apiKeyManagementQueue,
      [SaasHealthModuleKey.OAUTH_MANAGEMENT]: oauthManagementQueue,
      [SaasHealthModuleKey.SSO_FRAMEWORK]: ssoFrameworkQueue,
      [SaasHealthModuleKey.WEBHOOK_FRAMEWORK]: webhookFrameworkQueue,
      [SaasHealthModuleKey.APP_STORE]: appStoreQueue,
      [SaasHealthModuleKey.PLUGIN_FRAMEWORK]: pluginFrameworkQueue,
      [SaasHealthModuleKey.SAAS_ADMINISTRATION]: saasAdministrationQueue,
      [SaasHealthModuleKey.SAAS_AUDIT]: saasAuditQueue,
    };
  }

  async gatherSignals(workspaceId: string, module: SaasHealthModuleKey): Promise<IRawHealthSignals> {
    const queue = this.queuesByModule[module];

    const [jobCounts, isPaused, waiting] = await Promise.all([queue.getJobCounts(), queue.isPaused(), queue.getWaiting(0, 0)]);

    const oldestWaiting = waiting[0];
    const oldestWaitingJobAgeMs = oldestWaiting ? Date.now() - oldestWaiting.timestamp : null;

    const since = new Date(Date.now() - AUDIT_FAILURE_WINDOW_MINUTES * 60_000);
    const auditModule = MONITORED_MODULE_AUDIT_MODULE_MAP[module];
    const auditFailures = await this.auditLogsService.findAll(workspaceId, SAAS_MONITORING_INTERNAL_ROLE, {
      module: auditModule,
      outcome: ActivityOutcome.FAILURE,
      startDate: since.toISOString(),
      page: 1,
      limit: 1,
    });

    return {
      queueBacklog: (jobCounts.waiting ?? 0) + (jobCounts.delayed ?? 0),
      queueFailedCount: jobCounts.failed ?? 0,
      queueActiveCount: jobCounts.active ?? 0,
      queuePaused: isPaused,
      oldestWaitingJobAgeMs,
      auditFailureCount: auditFailures.total,
    };
  }

  /**
   * Extra, module-specific issues layered on top of the generic queue/audit
   * signal — each sourced from an already-exported, read-only aggregate the
   * owning module itself computes. Never escalates status past DEGRADED on
   * its own; these are secondary business signals, not primary infra
   * signals (that escalation stays `computeHealth`'s job).
   */
  async gatherBusinessIssues(workspaceId: string, module: SaasHealthModuleKey): Promise<ISaasHealthIssue[]> {
    const issues: ISaasHealthIssue[] = [];

    if (module === SaasHealthModuleKey.PAYMENT_PROVIDER || module === SaasHealthModuleKey.BILLING_ENGINE) {
      const overview = await this.saasAdministrationService.getTenantOverview(workspaceId).catch(() => null);

      if (module === SaasHealthModuleKey.PAYMENT_PROVIDER && overview && overview.recentPaymentFailures > 0) {
        issues.push({
          tag: SaasHealthIssueTag.PAYMENT_FAILURES,
          message: `${overview.recentPaymentFailures} recent payment failure(s) for this tenant`,
        });
      }

      if (module === SaasHealthModuleKey.BILLING_ENGINE && overview?.billing && overview.billing.outstandingBalance > 0) {
        issues.push({
          tag: SaasHealthIssueTag.OVERDUE_BILLING,
          message: `Outstanding balance ${overview.billing.outstandingBalance} on billing period status '${overview.billing.latestPeriodStatus ?? 'unknown'}'`,
        });
      }
    }

    if (module === SaasHealthModuleKey.PLUGIN_FRAMEWORK) {
      const quarantined = await this.pluginFrameworkService
        .findAllActivations(workspaceId, { status: PluginActivationStatus.QUARANTINED, page: 1, limit: 1 })
        .catch(() => null);
      if (quarantined && quarantined.total > 0) {
        issues.push({ tag: SaasHealthIssueTag.PLUGIN_QUARANTINED, message: `${quarantined.total} plugin activation(s) quarantined for this tenant` });
      }
    }

    if (module === SaasHealthModuleKey.WEBHOOK_FRAMEWORK) {
      const unhealthy = await this.webhookFrameworkService
        .findAllWebhooks(workspaceId, { healthStatus: WebhookHealthStatus.UNHEALTHY, page: 1, limit: 1 } as any)
        .catch(() => null);
      if (unhealthy && unhealthy.total > 0) {
        issues.push({ tag: SaasHealthIssueTag.WEBHOOK_UNHEALTHY, message: `${unhealthy.total} webhook endpoint(s) unhealthy for this tenant` });
      }
    }

    return issues;
  }

  computeHealth(
    module: SaasHealthModuleKey,
    signals: IRawHealthSignals,
    thresholds: IModuleHealthThresholds,
    previousConsecutiveDegraded: number,
    businessIssues: ISaasHealthIssue[] = [],
  ): IComputedHealth {
    const issues: ISaasHealthIssue[] = [...businessIssues];

    if (signals.queuePaused) {
      issues.push({ tag: SaasHealthIssueTag.QUEUE_PAUSED, message: `Queue for '${module}' is paused` });
    }

    const isCriticalBacklog = signals.queueBacklog >= thresholds.backlogCritical;
    const isWarningBacklog = signals.queueBacklog >= thresholds.backlogWarning;
    if (isWarningBacklog) {
      issues.push({
        tag: SaasHealthIssueTag.QUEUE_BACKLOG,
        message: `Queue backlog is ${signals.queueBacklog} (warning >= ${thresholds.backlogWarning}, critical >= ${thresholds.backlogCritical})`,
      });
    }

    const isCriticalFailures = signals.queueFailedCount >= thresholds.failedCritical || signals.auditFailureCount >= thresholds.auditFailureCritical;
    const isWarningFailures = signals.queueFailedCount >= thresholds.failedWarning || signals.auditFailureCount >= thresholds.auditFailureWarning;
    if (isWarningFailures) {
      issues.push({
        tag: SaasHealthIssueTag.HIGH_FAILURE_RATE,
        message: `${signals.queueFailedCount} failed queue job(s) and ${signals.auditFailureCount} audit failure(s) in the last ${AUDIT_FAILURE_WINDOW_MINUTES}m`,
      });
    }

    if (signals.oldestWaitingJobAgeMs !== null && signals.oldestWaitingJobAgeMs >= DELAYED_JOB_AGE_WARNING_MS) {
      issues.push({
        tag: SaasHealthIssueTag.DELAYED,
        message: `Oldest waiting job has been queued for ${Math.round(signals.oldestWaitingJobAgeMs / 1000)}s`,
      });
    }

    if (signals.queueActiveCount === 0 && isWarningBacklog) {
      issues.push({ tag: SaasHealthIssueTag.STUCK, message: 'Queue has a backlog but no active workers processing it' });
    }

    let status: SaasHealthStatus;
    if (signals.queuePaused || isCriticalBacklog || isCriticalFailures) {
      status = SaasHealthStatus.UNHEALTHY;
    } else if (isWarningBacklog || isWarningFailures || issues.length > 0) {
      status = SaasHealthStatus.DEGRADED;
    } else {
      status = SaasHealthStatus.HEALTHY;
    }

    if (status !== SaasHealthStatus.HEALTHY && previousConsecutiveDegraded + 1 >= REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD) {
      issues.push({
        tag: SaasHealthIssueTag.REPEATEDLY_FAILING,
        message: `Module has been unhealthy/degraded for ${previousConsecutiveDegraded + 1} consecutive checks`,
      });
    }

    const summary =
      issues.length === 0
        ? `'${module}' is healthy: backlog ${signals.queueBacklog}, failed ${signals.queueFailedCount}, audit failures ${signals.auditFailureCount}`
        : `'${module}' is ${status.toLowerCase()}: ${issues.map((i) => i.message).join('; ')}`;

    return { status, issues, safeSummary: sanitizeSummary(summary) };
  }
}
