import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { SettingScope, SettingValueType } from '@modules/settings/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PaymentProviderService } from '@modules/payment-provider/payment-provider.service';
import { IPaymentHealthResult } from '@modules/payment-provider/interfaces';
import { SaasMonitoringRepository } from './saas-monitoring.repository';
import { SaasMonitoringSignalService } from './saas-monitoring-signal.service';
import { SaasMonitoringEventQueue } from './jobs';
import {
  IModuleHealthThresholds,
  IPlatformHealthSummary,
  ISaasHealthIncident,
  ISaasHealthSnapshot,
  ITenantHealthSummary,
  SaasHealthCheckTrigger,
  SaasHealthEvent,
  SaasHealthIncidentStatus,
  SaasHealthModuleKey,
  SaasHealthStatus,
} from './interfaces';
import {
  SAAS_MONITORING_MODULE,
  SAAS_MONITORING_INTERNAL_ROLE,
  DEFAULT_THRESHOLDS,
  SAAS_MONITORING_BACKLOG_WARNING_SETTING,
  SAAS_MONITORING_BACKLOG_CRITICAL_SETTING,
  SAAS_MONITORING_FAILED_WARNING_SETTING,
  SAAS_MONITORING_FAILED_CRITICAL_SETTING,
  SAAS_MONITORING_AUDIT_FAILURE_WARNING_SETTING,
  SAAS_MONITORING_AUDIT_FAILURE_CRITICAL_SETTING,
  SAAS_MONITORING_STALE_CHECK_WARNING_MINUTES_SETTING,
} from './constants';
import { SaasHealthIncidentFilterDto, SaasHealthCheckLogFilterDto, PaginatedSaasHealthIncidentResponseDto, PaginatedSaasHealthCheckLogResponseDto } from './dto';
import { SaasMonitoringModuleNotMonitoredException, SaasMonitoringIncidentNotFoundException } from './exceptions/saas-monitoring.exceptions';

const THRESHOLD_SETTINGS: Array<{ key: string; label: string; defaultValue: number }> = [
  { key: SAAS_MONITORING_BACKLOG_WARNING_SETTING, label: 'Queue backlog warning threshold', defaultValue: DEFAULT_THRESHOLDS.backlogWarning },
  { key: SAAS_MONITORING_BACKLOG_CRITICAL_SETTING, label: 'Queue backlog critical threshold', defaultValue: DEFAULT_THRESHOLDS.backlogCritical },
  { key: SAAS_MONITORING_FAILED_WARNING_SETTING, label: 'Queue failed-job warning threshold', defaultValue: DEFAULT_THRESHOLDS.failedWarning },
  { key: SAAS_MONITORING_FAILED_CRITICAL_SETTING, label: 'Queue failed-job critical threshold', defaultValue: DEFAULT_THRESHOLDS.failedCritical },
  {
    key: SAAS_MONITORING_AUDIT_FAILURE_WARNING_SETTING,
    label: 'Audit failure-count warning threshold',
    defaultValue: DEFAULT_THRESHOLDS.auditFailureWarning,
  },
  {
    key: SAAS_MONITORING_AUDIT_FAILURE_CRITICAL_SETTING,
    label: 'Audit failure-count critical threshold',
    defaultValue: DEFAULT_THRESHOLDS.auditFailureCritical,
  },
  {
    key: SAAS_MONITORING_STALE_CHECK_WARNING_MINUTES_SETTING,
    label: 'Stale health-check warning (minutes)',
    defaultValue: DEFAULT_THRESHOLDS.staleCheckWarningMinutes,
  },
];

/**
 * SaasMonitoringService — platform/tenant health monitor for the SaaS
 * module family (subscriptions, billing, payments, usage, quota, feature
 * flags, licenses, API keys, OAuth, SSO, webhooks, App Store, Plugin
 * Framework, SaaS Administration, SaaS Audit). Mirrors Operations Health's
 * own service almost exactly — same snapshot/incident/check-log lifecycle,
 * same Settings-Framework-driven thresholds — applied to a different
 * monitored-module set, plus a platform-wide (cross-tenant) summary this
 * module adds since scope explicitly asks for a platform-level view.
 */
@Injectable()
export class SaasMonitoringService implements OnModuleInit {
  private readonly logger = new Logger(SaasMonitoringService.name);

  constructor(
    private readonly repository: SaasMonitoringRepository,
    private readonly signalService: SaasMonitoringSignalService,
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly paymentProviderService: PaymentProviderService,
    private readonly eventQueue: SaasMonitoringEventQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const setting of THRESHOLD_SETTINGS) {
      try {
        await this.settingsService.createDefinition(SAAS_MONITORING_INTERNAL_ROLE, {
          key: setting.key,
          category: 'SAAS_MONITORING',
          label: setting.label,
          valueType: SettingValueType.NUMBER,
          defaultValue: setting.defaultValue,
          allowedScopes: [SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
          module: SAAS_MONITORING_MODULE,
        } as any);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(`Failed to register saas-monitoring setting '${setting.key}': ${(error as Error).message}`);
        }
      }
    }
  }

  // ── Health checks ────────────────────────────────────────────────

  async checkModule(
    workspaceId: string,
    module: SaasHealthModuleKey,
    trigger: SaasHealthCheckTrigger = SaasHealthCheckTrigger.MANUAL,
  ): Promise<ISaasHealthSnapshot> {
    if (!Object.values(SaasHealthModuleKey).includes(module)) {
      throw new SaasMonitoringModuleNotMonitoredException(module);
    }

    const [signals, businessIssues, thresholds, previous] = await Promise.all([
      this.signalService.gatherSignals(workspaceId, module),
      this.signalService.gatherBusinessIssues(workspaceId, module),
      this.resolveThresholds(workspaceId),
      this.repository.findSnapshot(workspaceId, module),
    ]);

    const previousStatus = previous?.status ?? SaasHealthStatus.HEALTHY;
    const previousConsecutiveDegraded = previous?.consecutiveDegradedChecks ?? 0;

    const { status, issues, safeSummary } = this.signalService.computeHealth(module, signals, thresholds, previousConsecutiveDegraded, businessIssues);

    const now = new Date();
    const isHealthy = status === SaasHealthStatus.HEALTHY;

    const snapshot = await this.repository.upsertSnapshot(workspaceId, module, {
      status,
      queueBacklog: signals.queueBacklog,
      queueFailedCount: signals.queueFailedCount,
      queueActiveCount: signals.queueActiveCount,
      queuePaused: signals.queuePaused,
      oldestWaitingJobAgeMs: signals.oldestWaitingJobAgeMs,
      auditFailureCount: signals.auditFailureCount,
      consecutiveDegradedChecks: isHealthy ? 0 : previousConsecutiveDegraded + 1,
      consecutiveHealthyChecks: isHealthy ? (previous?.consecutiveHealthyChecks ?? 0) + 1 : 0,
      issues: issues as any,
      safeSummary,
      lastCheckedAt: now,
      lastHealthyAt: isHealthy ? now : previous?.lastHealthyAt,
      lastDegradedAt: status === SaasHealthStatus.DEGRADED ? now : previous?.lastDegradedAt,
      lastUnhealthyAt: status === SaasHealthStatus.UNHEALTHY ? now : previous?.lastUnhealthyAt,
    });

    await this.repository.createCheckLog({
      workspaceId,
      module,
      status,
      previousStatus,
      trigger,
      queueBacklog: signals.queueBacklog,
      queueFailedCount: signals.queueFailedCount,
      auditFailureCount: signals.auditFailureCount,
      issues: issues as any,
      safeSummary,
      checkedAt: now,
    });

    if (previousStatus !== status) {
      await this.handleTransition(workspaceId, module, previousStatus, status, safeSummary, issues);
    }

    return snapshot;
  }

  async checkAll(workspaceId: string, trigger: SaasHealthCheckTrigger = SaasHealthCheckTrigger.MANUAL): Promise<ISaasHealthSnapshot[]> {
    const results: ISaasHealthSnapshot[] = [];
    for (const module of Object.values(SaasHealthModuleKey)) {
      results.push(await this.checkModule(workspaceId, module, trigger));
    }
    return results;
  }

  /**
   * Scheduler-callable (no active scheduler wired in this codebase yet —
   * mirrors Operations Health's own manual-trigger endpoint). Sweeps every
   * workspace this module has already checked at least once; a workspace's
   * first-ever check must still come from an explicit `checkAll()`/
   * `checkModule()` call, since this module has no dependency on the
   * Workspace module to discover workspaces cold.
   */
  async processScheduledChecks(): Promise<{ workspacesChecked: number }> {
    const workspaceIds = await this.repository.findDistinctWorkspaceIds();
    for (const workspaceId of workspaceIds) {
      await this.checkAll(workspaceId, SaasHealthCheckTrigger.SCHEDULED);
    }
    return { workspacesChecked: workspaceIds.length };
  }

  // ── Summaries ────────────────────────────────────────────────────

  async getModuleSnapshot(workspaceId: string, module: SaasHealthModuleKey): Promise<ISaasHealthSnapshot | null> {
    return this.repository.findSnapshot(workspaceId, module);
  }

  async getTenantSummary(workspaceId: string): Promise<ITenantHealthSummary> {
    const modules = await this.repository.findSnapshotsByWorkspace(workspaceId);
    return { workspaceId, overallStatus: this.rollupStatus(modules.map((m) => m.status)), modules };
  }

  /** Cross-tenant, platform-wide rollup — every workspace this module has ever checked (self-discovered, same as `processScheduledChecks`), broken down per monitored module. `PlatformAdminGuard`-gated at the controller — never reachable by an ordinary tenant. */
  async getPlatformSummary(): Promise<IPlatformHealthSummary> {
    const workspaceIds = await this.repository.findDistinctWorkspaceIds();
    const moduleBreakdown: IPlatformHealthSummary['moduleBreakdown'] = {};
    const allStatuses: SaasHealthStatus[] = [];

    for (const module of Object.values(SaasHealthModuleKey)) {
      const snapshots = await this.repository.findSnapshotsByModuleAcrossWorkspaces(module);
      const breakdown = { healthy: 0, degraded: 0, unhealthy: 0 };
      for (const snapshot of snapshots) {
        if (snapshot.status === SaasHealthStatus.HEALTHY) breakdown.healthy++;
        else if (snapshot.status === SaasHealthStatus.DEGRADED) breakdown.degraded++;
        else breakdown.unhealthy++;
        allStatuses.push(snapshot.status);
      }
      moduleBreakdown[module] = breakdown;
    }

    return { overallStatus: this.rollupStatus(allStatuses), tenantsChecked: workspaceIds.length, moduleBreakdown };
  }

  /** Provider-level view — a live connection test against each configured payment provider account for this tenant, delegated entirely to `PaymentProviderService.checkAllHealth()` (never recomputed here, never touches credentials). Deliberately NOT part of the routine queue-based sweep — this makes real outbound calls and is only run on demand. */
  async getPaymentProviderHealth(workspaceId: string): Promise<IPaymentHealthResult[]> {
    return this.paymentProviderService.checkAllHealth(workspaceId);
  }

  async getIncidents(workspaceId: string, filter: SaasHealthIncidentFilterDto): Promise<PaginatedSaasHealthIncidentResponseDto> {
    const [data, total] = await this.repository.findIncidents(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Cross-tenant incident view — `PlatformAdminGuard`-gated at the controller; `filter.workspaceId` optionally narrows to one tenant. */
  async getIncidentsPlatformWide(filter: SaasHealthIncidentFilterDto): Promise<PaginatedSaasHealthIncidentResponseDto> {
    const [data, total] = await this.repository.findIncidents(filter.workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncident(id: string): Promise<ISaasHealthIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident) {
      throw new SaasMonitoringIncidentNotFoundException(id);
    }
    return incident;
  }

  async getCheckLogs(workspaceId: string, filter: SaasHealthCheckLogFilterDto): Promise<PaginatedSaasHealthCheckLogResponseDto> {
    const [data, total] = await this.repository.findCheckLogs(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private rollupStatus(statuses: SaasHealthStatus[]): SaasHealthStatus {
    if (statuses.includes(SaasHealthStatus.UNHEALTHY)) return SaasHealthStatus.UNHEALTHY;
    if (statuses.includes(SaasHealthStatus.DEGRADED)) return SaasHealthStatus.DEGRADED;
    return SaasHealthStatus.HEALTHY;
  }

  private async resolveThresholds(workspaceId: string): Promise<IModuleHealthThresholds> {
    const [backlogWarning, backlogCritical, failedWarning, failedCritical, auditFailureWarning, auditFailureCritical, staleCheckWarningMinutes] =
      await Promise.all(
        THRESHOLD_SETTINGS.map((s) =>
          this.settingsService
            .resolve({ workspaceId }, s.key)
            .then((r) => Number(r.value))
            .catch(() => s.defaultValue),
        ),
      );

    return { backlogWarning, backlogCritical, failedWarning, failedCritical, auditFailureWarning, auditFailureCritical, staleCheckWarningMinutes };
  }

  private async handleTransition(
    workspaceId: string,
    module: SaasHealthModuleKey,
    previousStatus: SaasHealthStatus,
    status: SaasHealthStatus,
    safeSummary: string,
    issues: unknown,
  ): Promise<void> {
    const wasHealthy = previousStatus === SaasHealthStatus.HEALTHY;
    const isHealthy = status === SaasHealthStatus.HEALTHY;

    if (!wasHealthy && isHealthy) {
      const openIncident = await this.repository.findOpenIncident(workspaceId, module);
      if (openIncident) {
        const resolvedAt = new Date();
        await this.repository.updateIncident(openIncident.id, {
          status: SaasHealthIncidentStatus.RESOLVED,
          resolvedAt,
          durationMs: resolvedAt.getTime() - openIncident.openedAt.getTime(),
        });
      }
      await this.recordAudit(workspaceId, `saas-monitoring.${module}.restored`, AuditActionCategory.UPDATE, module);
      await this.publishEvent(SaasHealthEvent.SAAS_HEALTH_RESTORED, workspaceId, module, status, previousStatus, openIncident?.id);
      return;
    }

    if (wasHealthy && !isHealthy) {
      const incident = await this.repository.createIncident({
        workspaceId,
        module,
        severity: status,
        status: SaasHealthIncidentStatus.OPEN,
        triggerSummary: safeSummary,
        issues: issues as any,
      });
      const event = status === SaasHealthStatus.UNHEALTHY ? SaasHealthEvent.SAAS_HEALTH_FAILED : SaasHealthEvent.SAAS_HEALTH_DEGRADED;
      await this.recordAudit(workspaceId, `saas-monitoring.${module}.${status.toLowerCase()}`, AuditActionCategory.UPDATE, module);
      await this.publishEvent(event, workspaceId, module, status, previousStatus, incident.id);
      return;
    }

    // DEGRADED <-> UNHEALTHY (still unhealthy overall): update the open incident's severity, re-publish the appropriate event, no new incident.
    const openIncident = await this.repository.findOpenIncident(workspaceId, module);
    if (openIncident) {
      await this.repository.updateIncident(openIncident.id, { severity: status, triggerSummary: safeSummary, issues: issues as any });
    }
    const event = status === SaasHealthStatus.UNHEALTHY ? SaasHealthEvent.SAAS_HEALTH_FAILED : SaasHealthEvent.SAAS_HEALTH_DEGRADED;
    await this.recordAudit(workspaceId, `saas-monitoring.${module}.${status.toLowerCase()}`, AuditActionCategory.UPDATE, module);
    await this.publishEvent(event, workspaceId, module, status, previousStatus, openIncident?.id);
  }

  private async recordAudit(workspaceId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.SYSTEM,
      action,
      actionCategory,
      module: SAAS_MONITORING_MODULE,
      entityType: 'SaasHealthModule',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: SaasHealthEvent,
    workspaceId: string,
    module: string,
    status: SaasHealthStatus,
    previousStatus: SaasHealthStatus,
    incidentId?: string,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, module, status, previousStatus, incidentId });
  }
}
