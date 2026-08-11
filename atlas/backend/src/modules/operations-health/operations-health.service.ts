import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { SettingScope, SettingValueType } from '@modules/settings/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { OperationsHealthRepository } from './operations-health.repository';
import { OperationsHealthMonitorService } from './operations-health-monitor.service';
import { OperationsHealthEventQueue } from './jobs';
import {
  IModuleHealthThresholds,
  IOperationsHealthIncident,
  IOperationsHealthSnapshot,
  IOrganizationHealthSummary,
  IWorkspaceHealthSummary,
  OperationsHealthCheckTrigger,
  OperationsHealthEvent,
  OperationsHealthIncidentStatus,
  OperationsHealthModuleKey,
  OperationsHealthStatus,
} from './interfaces';
import {
  OPERATIONS_HEALTH_MODULE,
  OPERATIONS_HEALTH_INTERNAL_ROLE,
  DEFAULT_THRESHOLDS,
  OPERATIONS_HEALTH_BACKLOG_WARNING_SETTING,
  OPERATIONS_HEALTH_BACKLOG_CRITICAL_SETTING,
  OPERATIONS_HEALTH_FAILED_WARNING_SETTING,
  OPERATIONS_HEALTH_FAILED_CRITICAL_SETTING,
  OPERATIONS_HEALTH_AUDIT_FAILURE_WARNING_SETTING,
  OPERATIONS_HEALTH_AUDIT_FAILURE_CRITICAL_SETTING,
  OPERATIONS_HEALTH_STALE_CHECK_WARNING_MINUTES_SETTING,
} from './constants';
import { IncidentFilterDto, CheckLogFilterDto, PaginatedIncidentResponseDto, PaginatedCheckLogResponseDto } from './dto';
import { OperationsHealthModuleNotMonitoredException, OperationsHealthIncidentNotFoundException } from './exceptions/operations-health.exceptions';

const THRESHOLD_SETTINGS: Array<{ key: string; label: string; defaultValue: number }> = [
  { key: OPERATIONS_HEALTH_BACKLOG_WARNING_SETTING, label: 'Queue backlog warning threshold', defaultValue: DEFAULT_THRESHOLDS.backlogWarning },
  { key: OPERATIONS_HEALTH_BACKLOG_CRITICAL_SETTING, label: 'Queue backlog critical threshold', defaultValue: DEFAULT_THRESHOLDS.backlogCritical },
  { key: OPERATIONS_HEALTH_FAILED_WARNING_SETTING, label: 'Queue failed-job warning threshold', defaultValue: DEFAULT_THRESHOLDS.failedWarning },
  { key: OPERATIONS_HEALTH_FAILED_CRITICAL_SETTING, label: 'Queue failed-job critical threshold', defaultValue: DEFAULT_THRESHOLDS.failedCritical },
  {
    key: OPERATIONS_HEALTH_AUDIT_FAILURE_WARNING_SETTING,
    label: 'Audit failure-count warning threshold',
    defaultValue: DEFAULT_THRESHOLDS.auditFailureWarning,
  },
  {
    key: OPERATIONS_HEALTH_AUDIT_FAILURE_CRITICAL_SETTING,
    label: 'Audit failure-count critical threshold',
    defaultValue: DEFAULT_THRESHOLDS.auditFailureCritical,
  },
  {
    key: OPERATIONS_HEALTH_STALE_CHECK_WARNING_MINUTES_SETTING,
    label: 'Stale health-check warning (minutes)',
    defaultValue: DEFAULT_THRESHOLDS.staleCheckWarningMinutes,
  },
];

@Injectable()
export class OperationsHealthService implements OnModuleInit {
  private readonly logger = new Logger(OperationsHealthService.name);

  constructor(
    private readonly repository: OperationsHealthRepository,
    private readonly monitor: OperationsHealthMonitorService,
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: OperationsHealthEventQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const setting of THRESHOLD_SETTINGS) {
      try {
        await this.settingsService.createDefinition(OPERATIONS_HEALTH_INTERNAL_ROLE, {
          key: setting.key,
          category: 'OPERATIONS_HEALTH',
          label: setting.label,
          valueType: SettingValueType.NUMBER,
          defaultValue: setting.defaultValue,
          allowedScopes: [SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
          module: OPERATIONS_HEALTH_MODULE,
        } as any);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(`Failed to register operations-health setting '${setting.key}': ${(error as Error).message}`);
        }
      }
    }
  }

  // ── Health checks ────────────────────────────────────────────────

  async checkModule(
    workspaceId: string,
    module: OperationsHealthModuleKey,
    trigger: OperationsHealthCheckTrigger = OperationsHealthCheckTrigger.MANUAL,
  ): Promise<IOperationsHealthSnapshot> {
    if (!Object.values(OperationsHealthModuleKey).includes(module)) {
      throw new OperationsHealthModuleNotMonitoredException(module);
    }

    const [signals, thresholds, previous] = await Promise.all([
      this.monitor.gatherSignals(workspaceId, module),
      this.resolveThresholds(workspaceId),
      this.repository.findSnapshot(workspaceId, module),
    ]);

    const previousStatus = previous?.status ?? OperationsHealthStatus.HEALTHY;
    const previousConsecutiveDegraded = previous?.consecutiveDegradedChecks ?? 0;

    const { status, issues, safeSummary } = this.monitor.computeHealth(module, signals, thresholds, previousConsecutiveDegraded);

    const now = new Date();
    const isHealthy = status === OperationsHealthStatus.HEALTHY;

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
      lastDegradedAt: status === OperationsHealthStatus.DEGRADED ? now : previous?.lastDegradedAt,
      lastUnhealthyAt: status === OperationsHealthStatus.UNHEALTHY ? now : previous?.lastUnhealthyAt,
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

  async checkAll(
    workspaceId: string,
    trigger: OperationsHealthCheckTrigger = OperationsHealthCheckTrigger.MANUAL,
  ): Promise<IOperationsHealthSnapshot[]> {
    const results: IOperationsHealthSnapshot[] = [];
    for (const module of Object.values(OperationsHealthModuleKey)) {
      results.push(await this.checkModule(workspaceId, module, trigger));
    }
    return results;
  }

  /**
   * Scheduler-callable (no active scheduler wired — mirrors Approval
   * Workflow / Task Management / Business Rules Engine's own manual-trigger
   * endpoints). Sweeps every workspace this module has already checked at
   * least once; a workspace's first-ever check must still come from an
   * explicit `checkAll()`/`checkModule()` call, since this module has no
   * dependency on the Workspace module to discover workspaces cold.
   */
  async processScheduledChecks(): Promise<{ workspacesChecked: number }> {
    const workspaceIds = await this.repository.findDistinctWorkspaceIds();
    for (const workspaceId of workspaceIds) {
      await this.checkAll(workspaceId, OperationsHealthCheckTrigger.SCHEDULED);
    }
    return { workspacesChecked: workspaceIds.length };
  }

  // ── Summaries ────────────────────────────────────────────────────

  async getModuleSnapshot(workspaceId: string, module: OperationsHealthModuleKey): Promise<IOperationsHealthSnapshot | null> {
    return this.repository.findSnapshot(workspaceId, module);
  }

  async getWorkspaceSummary(workspaceId: string): Promise<IWorkspaceHealthSummary> {
    const modules = await this.repository.findSnapshotsByWorkspace(workspaceId);
    return { workspaceId, overallStatus: this.rollupStatus(modules.map((m) => m.status)), modules };
  }

  async getOrganizationSummary(organizationId: string, workspaceIds: string[]): Promise<IOrganizationHealthSummary> {
    const workspaces = await Promise.all(workspaceIds.map((id) => this.getWorkspaceSummary(id)));
    return { organizationId, overallStatus: this.rollupStatus(workspaces.map((w) => w.overallStatus)), workspaces };
  }

  async getIncidents(workspaceId: string, filter: IncidentFilterDto): Promise<PaginatedIncidentResponseDto> {
    const [data, total] = await this.repository.findIncidents(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncident(id: string): Promise<IOperationsHealthIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident) {
      throw new OperationsHealthIncidentNotFoundException(id);
    }
    return incident;
  }

  async getCheckLogs(workspaceId: string, filter: CheckLogFilterDto): Promise<PaginatedCheckLogResponseDto> {
    const [data, total] = await this.repository.findCheckLogs(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Private helpers ──────────────────────────────────────────────

  private rollupStatus(statuses: OperationsHealthStatus[]): OperationsHealthStatus {
    if (statuses.includes(OperationsHealthStatus.UNHEALTHY)) return OperationsHealthStatus.UNHEALTHY;
    if (statuses.includes(OperationsHealthStatus.DEGRADED)) return OperationsHealthStatus.DEGRADED;
    return OperationsHealthStatus.HEALTHY;
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
    module: OperationsHealthModuleKey,
    previousStatus: OperationsHealthStatus,
    status: OperationsHealthStatus,
    safeSummary: string,
    issues: unknown,
  ): Promise<void> {
    const wasHealthy = previousStatus === OperationsHealthStatus.HEALTHY;
    const isHealthy = status === OperationsHealthStatus.HEALTHY;

    if (!wasHealthy && isHealthy) {
      const openIncident = await this.repository.findOpenIncident(workspaceId, module);
      if (openIncident) {
        const resolvedAt = new Date();
        await this.repository.updateIncident(openIncident.id, {
          status: OperationsHealthIncidentStatus.RESOLVED,
          resolvedAt,
          durationMs: resolvedAt.getTime() - openIncident.openedAt.getTime(),
        });
      }
      await this.recordAudit(workspaceId, `operations-health.${module}.restored`, AuditActionCategory.UPDATE, module);
      await this.publishEvent(OperationsHealthEvent.OPERATIONS_HEALTH_RESTORED, workspaceId, module, status, previousStatus, openIncident?.id);
      return;
    }

    if (wasHealthy && !isHealthy) {
      const incident = await this.repository.createIncident({
        workspaceId,
        module,
        severity: status,
        status: OperationsHealthIncidentStatus.OPEN,
        triggerSummary: safeSummary,
        issues: issues as any,
      });
      const event = status === OperationsHealthStatus.UNHEALTHY ? OperationsHealthEvent.OPERATIONS_HEALTH_FAILED : OperationsHealthEvent.OPERATIONS_HEALTH_DEGRADED;
      await this.recordAudit(workspaceId, `operations-health.${module}.${status.toLowerCase()}`, AuditActionCategory.UPDATE, module);
      await this.publishEvent(event, workspaceId, module, status, previousStatus, incident.id);
      return;
    }

    // DEGRADED <-> UNHEALTHY (still unhealthy overall): update the open incident's severity, re-publish the appropriate event, no new incident.
    const openIncident = await this.repository.findOpenIncident(workspaceId, module);
    if (openIncident) {
      await this.repository.updateIncident(openIncident.id, { severity: status, triggerSummary: safeSummary, issues: issues as any });
    }
    const event = status === OperationsHealthStatus.UNHEALTHY ? OperationsHealthEvent.OPERATIONS_HEALTH_FAILED : OperationsHealthEvent.OPERATIONS_HEALTH_DEGRADED;
    await this.recordAudit(workspaceId, `operations-health.${module}.${status.toLowerCase()}`, AuditActionCategory.UPDATE, module);
    await this.publishEvent(event, workspaceId, module, status, previousStatus, openIncident?.id);
  }

  private async recordAudit(workspaceId: string, action: string, actionCategory: AuditActionCategory, entityId: string): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.SYSTEM,
      action,
      actionCategory,
      module: OPERATIONS_HEALTH_MODULE,
      entityType: 'OperationsHealthModule',
      entityId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: OperationsHealthEvent,
    workspaceId: string,
    module: string,
    status: OperationsHealthStatus,
    previousStatus: OperationsHealthStatus,
    incidentId?: string,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, module, status, previousStatus, incidentId });
  }
}
