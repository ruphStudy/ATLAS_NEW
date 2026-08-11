import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SettingsService } from '@modules/settings/settings.service';
import { SettingDefinitionAlreadyExistsException } from '@modules/settings/exceptions/settings.exceptions';
import { SettingScope, SettingValueType } from '@modules/settings/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { SaasMonitoringService } from '@modules/saas-monitoring/saas-monitoring.service';
import { SaasHealthCheckTrigger as MonitoringTrigger, SaasHealthStatus } from '@modules/saas-monitoring/interfaces';
import { TenantAnalyticsService } from '@modules/tenant-analytics/tenant-analytics.service';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { SaasHealthRepository } from './saas-health.repository';
import { SaasHealthEventQueue } from './jobs';
import {
  IDependencyIssue,
  IModuleBreakdownEntry,
  IOrganizationHealthResult,
  IPlatformHealthResult,
  ISaasHealthAggregateIncident,
  ISaasHealthMaintenanceWindow,
  ITenantHealthResult,
  SaasHealthAggregateIncidentStatus,
  SaasHealthEvaluationTrigger,
  SaasHealthAggregateEvent,
  SaasHealthLevel,
  SaasHealthMaintenanceState,
  SaasHealthModuleKey,
} from './interfaces';
import {
  DEFAULT_SCORE_CONFIG,
  MODULE_DEPENDENCY_GRAPH,
  REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD,
  SAAS_HEALTH_INTERNAL_ROLE,
  SAAS_HEALTH_MODULE,
  SAAS_HEALTH_SCORE_BUSINESS_WEIGHT_SETTING,
  SAAS_HEALTH_SCORE_CASCADING_PENALTY_SETTING,
  SAAS_HEALTH_SCORE_MODULE_WEIGHT_SETTING,
  SAAS_HEALTH_DEGRADED_SCORE_THRESHOLD_SETTING,
  SAAS_HEALTH_UNHEALTHY_SCORE_THRESHOLD_SETTING,
  STATUS_SCORE_MAP,
} from './constants';
import {
  CreateMaintenanceWindowDto,
  SaasHealthAggregateIncidentFilterDto,
  SaasHealthEvaluationLogFilterDto,
  PaginatedSaasHealthAggregateIncidentResponseDto,
  PaginatedSaasHealthEvaluationLogResponseDto,
} from './dto';
import {
  SaasHealthIncidentNotFoundException,
  SaasHealthInvalidMaintenanceWindowException,
  SaasHealthMaintenanceWindowNotFoundException,
} from './exceptions/saas-health.exceptions';

interface IScoreConfig {
  moduleWeight: number;
  businessWeight: number;
  cascadingPenaltyPerImpact: number;
  degradedScoreThreshold: number;
  unhealthyScoreThreshold: number;
}

const SCORE_SETTINGS: Array<{ key: string; label: string; defaultValue: number }> = [
  { key: SAAS_HEALTH_SCORE_MODULE_WEIGHT_SETTING, label: 'Composite score: module-status weight', defaultValue: DEFAULT_SCORE_CONFIG.moduleWeight },
  { key: SAAS_HEALTH_SCORE_BUSINESS_WEIGHT_SETTING, label: 'Composite score: business-health weight', defaultValue: DEFAULT_SCORE_CONFIG.businessWeight },
  {
    key: SAAS_HEALTH_SCORE_CASCADING_PENALTY_SETTING,
    label: 'Composite score: points deducted per cascading impact',
    defaultValue: DEFAULT_SCORE_CONFIG.cascadingPenaltyPerImpact,
  },
  { key: SAAS_HEALTH_DEGRADED_SCORE_THRESHOLD_SETTING, label: 'Score at/below which a tenant is DEGRADED', defaultValue: DEFAULT_SCORE_CONFIG.degradedScoreThreshold },
  {
    key: SAAS_HEALTH_UNHEALTHY_SCORE_THRESHOLD_SETTING,
    label: 'Score at/below which a tenant is UNHEALTHY',
    defaultValue: DEFAULT_SCORE_CONFIG.unhealthyScoreThreshold,
  },
];

const LEVEL_RANK: Record<SaasHealthLevel, number> = {
  [SaasHealthLevel.HEALTHY]: 0,
  [SaasHealthLevel.DEGRADED]: 1,
  [SaasHealthLevel.UNHEALTHY]: 2,
  [SaasHealthLevel.OFFLINE]: 3,
  [SaasHealthLevel.MAINTENANCE]: -1, // MAINTENANCE overrides everything, ranked separately — never compared for "worse than".
};

/**
 * SaasHealthService — the consolidated, tenant/organization/platform-level
 * health view for the SaaS module family. Never re-gathers a raw signal
 * itself: `evaluateTenant()` asks `SaasMonitoringService` to refresh its
 * own per-module snapshots (the same signal-collection SaaS Monitoring
 * already owns), then reads them back plus Tenant Analytics' own
 * already-computed business health score — purely a read+aggregate+score
 * layer on top, exactly mirroring the SaaS Audit / Audit Logs precedent.
 * Owns exactly three genuinely new concerns: a composite 0-100 health
 * score, cascading-dependency-impact detection over a static module graph,
 * and maintenance windows.
 */
@Injectable()
export class SaasHealthService implements OnModuleInit {
  private readonly logger = new Logger(SaasHealthService.name);

  constructor(
    private readonly repository: SaasHealthRepository,
    private readonly saasMonitoringService: SaasMonitoringService,
    private readonly tenantAnalyticsService: TenantAnalyticsService,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly settingsService: SettingsService,
    private readonly auditLogsService: AuditLogsService,
    private readonly eventQueue: SaasHealthEventQueue,
  ) {}

  async onModuleInit(): Promise<void> {
    for (const setting of SCORE_SETTINGS) {
      try {
        await this.settingsService.createDefinition(SAAS_HEALTH_INTERNAL_ROLE, {
          key: setting.key,
          category: 'SAAS_HEALTH',
          label: setting.label,
          valueType: SettingValueType.NUMBER,
          defaultValue: setting.defaultValue,
          allowedScopes: [SettingScope.ORGANIZATION, SettingScope.WORKSPACE],
          module: SAAS_HEALTH_MODULE,
        } as any);
      } catch (error) {
        if (!(error instanceof SettingDefinitionAlreadyExistsException)) {
          this.logger.warn(`Failed to register saas-health setting '${setting.key}': ${(error as Error).message}`);
        }
      }
    }
  }

  // ── Evaluation ───────────────────────────────────────────────────

  async evaluateTenant(workspaceId: string, trigger: SaasHealthEvaluationTrigger = SaasHealthEvaluationTrigger.MANUAL): Promise<ITenantHealthResult> {
    const monitoringTrigger = trigger === SaasHealthEvaluationTrigger.SCHEDULED ? MonitoringTrigger.SCHEDULED : MonitoringTrigger.MANUAL;
    await this.saasMonitoringService.checkAll(workspaceId, monitoringTrigger);
    const tenantSummary = await this.saasMonitoringService.getTenantSummary(workspaceId);

    const now = new Date();
    const statusByModule = new Map<string, SaasHealthStatus>();
    for (const snapshot of tenantSummary.modules) {
      statusByModule.set(snapshot.module, snapshot.status);
    }

    const moduleBreakdown: IModuleBreakdownEntry[] = [];
    for (const snapshot of tenantSummary.modules) {
      const activeWindow = await this.repository.findActiveWindowForModule(workspaceId, snapshot.module, now);
      const status = activeWindow ? SaasHealthStatus.HEALTHY : snapshot.status;
      let score = STATUS_SCORE_MAP[status] ?? 60;
      if (!activeWindow) {
        if (snapshot.queueBacklog > 0) score -= Math.min(20, Math.floor(snapshot.queueBacklog / 10));
        if (snapshot.oldestWaitingJobAgeMs !== null && snapshot.oldestWaitingJobAgeMs !== undefined && snapshot.oldestWaitingJobAgeMs > 60_000) score -= 10;
      }
      moduleBreakdown.push({ module: snapshot.module as SaasHealthModuleKey, status, scoreContribution: Math.max(0, Math.min(100, score)) });
    }

    const dependencyIssues = this.computeDependencyIssues(statusByModule);
    const cascadingImpacts = dependencyIssues.filter((issue) => statusByModule.get(issue.module) !== SaasHealthStatus.UNHEALTHY);

    const config = await this.resolveScoreConfig(workspaceId);
    const moduleScore = moduleBreakdown.length > 0 ? moduleBreakdown.reduce((sum, m) => sum + m.scoreContribution, 0) / moduleBreakdown.length : 100;
    const moduleScoreAfterCascading = Math.max(0, moduleScore - cascadingImpacts.length * config.cascadingPenaltyPerImpact);

    const businessSnapshot = await this.tenantAnalyticsService.getTenantHealthScore(workspaceId).catch(() => null);
    const businessScore = businessSnapshot?.healthScore ?? moduleScoreAfterCascading;

    const healthScore = Math.round(Math.max(0, Math.min(100, moduleScoreAfterCascading * config.moduleWeight + businessScore * config.businessWeight)));

    const tenantWideWindow = await this.repository.findActiveTenantWideWindow(workspaceId, now);
    const level = this.determineLevel(moduleBreakdown, cascadingImpacts, healthScore, config, !!tenantWideWindow);

    const previous = await this.repository.findSnapshot(workspaceId);
    const previousLevel = previous?.level ?? SaasHealthLevel.HEALTHY;
    const previousConsecutiveDegraded = previous?.consecutiveDegradedEvaluations ?? 0;
    const isHealthy = level === SaasHealthLevel.HEALTHY;

    let safeSummary = this.buildSummary(level, healthScore, moduleBreakdown, cascadingImpacts, dependencyIssues);
    if (!isHealthy && previousConsecutiveDegraded + 1 >= REPEATEDLY_FAILING_CONSECUTIVE_THRESHOLD) {
      safeSummary += `; repeatedly failing for ${previousConsecutiveDegraded + 1} consecutive evaluations`;
    }

    await this.repository.upsertSnapshot(workspaceId, {
      level,
      healthScore,
      moduleBreakdown: moduleBreakdown as any,
      cascadingImpacts: cascadingImpacts as any,
      dependencyIssues: dependencyIssues as any,
      consecutiveDegradedEvaluations: isHealthy ? 0 : previousConsecutiveDegraded + 1,
      consecutiveHealthyEvaluations: isHealthy ? (previous?.consecutiveHealthyEvaluations ?? 0) + 1 : 0,
      safeSummary,
      lastEvaluatedAt: now,
      lastHealthyAt: isHealthy ? now : previous?.lastHealthyAt,
      lastDegradedAt: level === SaasHealthLevel.DEGRADED ? now : previous?.lastDegradedAt,
      lastUnhealthyAt: level === SaasHealthLevel.UNHEALTHY || level === SaasHealthLevel.OFFLINE ? now : previous?.lastUnhealthyAt,
    });

    await this.repository.createEvaluationLog({
      workspaceId,
      level,
      previousLevel,
      trigger,
      healthScore,
      moduleBreakdown: moduleBreakdown as any,
      safeSummary,
      evaluatedAt: now,
    });

    if (previousLevel !== level) {
      await this.handleTransition(workspaceId, previousLevel, level, healthScore, safeSummary, moduleBreakdown, cascadingImpacts);
    }

    return { workspaceId, level, healthScore, moduleBreakdown, cascadingImpacts, dependencyIssues, safeSummary };
  }

  /** Scheduler-callable (no active scheduler wired in this codebase yet). Sweeps every tenant this module has already evaluated at least once — a tenant's first-ever evaluation must come from an explicit `evaluateTenant()` call. */
  async processScheduledEvaluations(): Promise<{ tenantsEvaluated: number }> {
    const workspaceIds = await this.repository.findDistinctWorkspaceIds();
    for (const workspaceId of workspaceIds) {
      await this.evaluateTenant(workspaceId, SaasHealthEvaluationTrigger.SCHEDULED);
    }
    return { tenantsEvaluated: workspaceIds.length };
  }

  // ── Summaries (read-only — reflect the latest persisted evaluation, never force a fresh one) ──

  /** Cross-tenant, platform-wide rollup — `PlatformAdminGuard`-gated at the controller. */
  async getPlatformSummary(): Promise<IPlatformHealthResult> {
    const snapshots = await this.repository.findAllSnapshots();
    const levelBreakdown: Record<string, number> = {};
    let totalScore = 0;

    for (const snapshot of snapshots) {
      levelBreakdown[snapshot.level] = (levelBreakdown[snapshot.level] ?? 0) + 1;
      totalScore += snapshot.healthScore;
    }

    return {
      level: this.rollupLevel(snapshots.map((s) => s.level)),
      averageHealthScore: snapshots.length > 0 ? Math.round(totalScore / snapshots.length) : 100,
      tenantsEvaluated: snapshots.length,
      levelBreakdown,
    };
  }

  /** Cross-tenant, organization-scoped rollup — `PlatformAdminGuard`-gated at the controller. Resolves membership via `Workspace.organizationId` directly (no `Organization` table/join exists yet — see that column's own doc comment), same helper added for SaaS Audit. */
  async getOrganizationSummary(organizationId: string): Promise<IOrganizationHealthResult> {
    const workspaceIds = await this.workspaceRepository.findIdsByOrganization(organizationId);
    const tenants = workspaceIds.length > 0 ? await this.repository.findSnapshotsByWorkspaceIds(workspaceIds) : [];
    const totalScore = tenants.reduce((sum, t) => sum + t.healthScore, 0);

    return {
      organizationId,
      level: this.rollupLevel(tenants.map((t) => t.level)),
      averageHealthScore: tenants.length > 0 ? Math.round(totalScore / tenants.length) : 100,
      tenants,
    };
  }

  async getTenantSnapshot(workspaceId: string) {
    return this.repository.findSnapshot(workspaceId);
  }

  async getIncidents(workspaceId: string, filter: SaasHealthAggregateIncidentFilterDto): Promise<PaginatedSaasHealthAggregateIncidentResponseDto> {
    const [data, total] = await this.repository.findIncidents(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /** Cross-tenant incident view — `PlatformAdminGuard`-gated at the controller; `filter.workspaceId` optionally narrows to one tenant. */
  async getIncidentsPlatformWide(filter: SaasHealthAggregateIncidentFilterDto): Promise<PaginatedSaasHealthAggregateIncidentResponseDto> {
    const [data, total] = await this.repository.findIncidents(filter.workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncident(id: string): Promise<ISaasHealthAggregateIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident) {
      throw new SaasHealthIncidentNotFoundException(id);
    }
    return incident;
  }

  async getEvaluationLogs(workspaceId: string, filter: SaasHealthEvaluationLogFilterDto): Promise<PaginatedSaasHealthEvaluationLogResponseDto> {
    const [data, total] = await this.repository.findEvaluationLogs(workspaceId, filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ── Maintenance windows ──────────────────────────────────────────

  async createMaintenanceWindow(userId: string, dto: CreateMaintenanceWindowDto): Promise<ISaasHealthMaintenanceWindow> {
    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);
    if (endAt <= startAt) {
      throw new SaasHealthInvalidMaintenanceWindowException('`endAt` must be after `startAt`');
    }

    return this.repository.createMaintenanceWindow({
      workspaceId: dto.workspaceId ?? null,
      module: dto.module ?? null,
      reason: dto.reason,
      startAt,
      endAt,
      createdBy: userId,
    });
  }

  async cancelMaintenanceWindow(id: string): Promise<ISaasHealthMaintenanceWindow> {
    const window = await this.repository.findMaintenanceWindowById(id);
    if (!window) {
      throw new SaasHealthMaintenanceWindowNotFoundException(id);
    }
    return this.repository.updateMaintenanceWindow(id, { cancelledAt: new Date() });
  }

  async getMaintenanceWindow(id: string): Promise<ISaasHealthMaintenanceWindow> {
    const window = await this.repository.findMaintenanceWindowById(id);
    if (!window) {
      throw new SaasHealthMaintenanceWindowNotFoundException(id);
    }
    return window;
  }

  async listMaintenanceWindows(workspaceId?: string): Promise<ISaasHealthMaintenanceWindow[]> {
    return this.repository.findAllMaintenanceWindows(workspaceId);
  }

  deriveMaintenanceState(window: ISaasHealthMaintenanceWindow, now: Date = new Date()): SaasHealthMaintenanceState {
    if (window.cancelledAt) return SaasHealthMaintenanceState.CANCELLED;
    if (now < window.startAt) return SaasHealthMaintenanceState.SCHEDULED;
    if (now > window.endAt) return SaasHealthMaintenanceState.COMPLETED;
    return SaasHealthMaintenanceState.ACTIVE;
  }

  // ── Private helpers ──────────────────────────────────────────────

  private computeDependencyIssues(statusByModule: Map<string, SaasHealthStatus>): IDependencyIssue[] {
    const issues: IDependencyIssue[] = [];

    for (const [module, deps] of Object.entries(MODULE_DEPENDENCY_GRAPH)) {
      if (!statusByModule.has(module)) continue;
      const unhealthyDeps = deps.filter((dep) => statusByModule.get(dep) === SaasHealthStatus.UNHEALTHY);
      if (unhealthyDeps.length > 0) {
        issues.push({
          module: module as SaasHealthModuleKey,
          dependsOn: unhealthyDeps,
          message: `'${module}' depends on unhealthy module(s): ${unhealthyDeps.join(', ')}`,
        });
      }
    }

    return issues;
  }

  private determineLevel(
    moduleBreakdown: IModuleBreakdownEntry[],
    cascadingImpacts: IDependencyIssue[],
    healthScore: number,
    config: IScoreConfig,
    tenantWideMaintenanceActive: boolean,
  ): SaasHealthLevel {
    if (tenantWideMaintenanceActive) {
      return SaasHealthLevel.MAINTENANCE;
    }

    if (moduleBreakdown.length > 0 && moduleBreakdown.every((m) => m.status === SaasHealthStatus.UNHEALTHY)) {
      return SaasHealthLevel.OFFLINE;
    }

    const worstModuleLevel = moduleBreakdown.some((m) => m.status === SaasHealthStatus.UNHEALTHY)
      ? SaasHealthLevel.UNHEALTHY
      : moduleBreakdown.some((m) => m.status === SaasHealthStatus.DEGRADED)
        ? SaasHealthLevel.DEGRADED
        : SaasHealthLevel.HEALTHY;

    const scoreLevel =
      healthScore <= config.unhealthyScoreThreshold
        ? SaasHealthLevel.UNHEALTHY
        : healthScore <= config.degradedScoreThreshold
          ? SaasHealthLevel.DEGRADED
          : SaasHealthLevel.HEALTHY;

    let level = LEVEL_RANK[worstModuleLevel] >= LEVEL_RANK[scoreLevel] ? worstModuleLevel : scoreLevel;

    if (level === SaasHealthLevel.HEALTHY && cascadingImpacts.length > 0) {
      level = SaasHealthLevel.DEGRADED;
    }

    return level;
  }

  private buildSummary(
    level: SaasHealthLevel,
    healthScore: number,
    moduleBreakdown: IModuleBreakdownEntry[],
    cascadingImpacts: IDependencyIssue[],
    dependencyIssues: IDependencyIssue[],
  ): string {
    if (level === SaasHealthLevel.MAINTENANCE) {
      return 'Tenant is under an active maintenance window';
    }

    const unhealthy = moduleBreakdown.filter((m) => m.status === SaasHealthStatus.UNHEALTHY).map((m) => m.module);
    const degraded = moduleBreakdown.filter((m) => m.status === SaasHealthStatus.DEGRADED).map((m) => m.module);

    const parts: string[] = [`score ${healthScore}`];
    if (unhealthy.length > 0) parts.push(`unhealthy: ${unhealthy.join(', ')}`);
    if (degraded.length > 0) parts.push(`degraded: ${degraded.join(', ')}`);
    if (cascadingImpacts.length > 0) parts.push(`${cascadingImpacts.length} cascading impact(s)`);
    if (dependencyIssues.length > cascadingImpacts.length) parts.push(`${dependencyIssues.length} dependency issue(s)`);

    return `Tenant is ${level.toLowerCase()}: ${parts.join('; ')}`;
  }

  private rollupLevel(levels: SaasHealthLevel[]): SaasHealthLevel {
    const nonMaintenance = levels.filter((l) => l !== SaasHealthLevel.MAINTENANCE);
    if (nonMaintenance.length === 0) return levels.length > 0 ? SaasHealthLevel.MAINTENANCE : SaasHealthLevel.HEALTHY;
    if (nonMaintenance.includes(SaasHealthLevel.OFFLINE)) return SaasHealthLevel.OFFLINE;
    if (nonMaintenance.includes(SaasHealthLevel.UNHEALTHY)) return SaasHealthLevel.UNHEALTHY;
    if (nonMaintenance.includes(SaasHealthLevel.DEGRADED)) return SaasHealthLevel.DEGRADED;
    return SaasHealthLevel.HEALTHY;
  }

  private async resolveScoreConfig(workspaceId: string): Promise<IScoreConfig> {
    const [moduleWeight, businessWeight, cascadingPenaltyPerImpact, degradedScoreThreshold, unhealthyScoreThreshold] = await Promise.all(
      SCORE_SETTINGS.map((s) =>
        this.settingsService
          .resolve({ workspaceId }, s.key)
          .then((r) => Number(r.value))
          .catch(() => s.defaultValue),
      ),
    );

    return { moduleWeight, businessWeight, cascadingPenaltyPerImpact, degradedScoreThreshold, unhealthyScoreThreshold };
  }

  private async handleTransition(
    workspaceId: string,
    previousLevel: SaasHealthLevel,
    level: SaasHealthLevel,
    healthScore: number,
    safeSummary: string,
    moduleBreakdown: IModuleBreakdownEntry[],
    cascadingImpacts: IDependencyIssue[],
  ): Promise<void> {
    const wasHealthy = previousLevel === SaasHealthLevel.HEALTHY;
    const isHealthy = level === SaasHealthLevel.HEALTHY;
    const affectedModules = moduleBreakdown.filter((m) => m.status !== SaasHealthStatus.HEALTHY).map((m) => m.module);
    const cascadingFrom = [...new Set(cascadingImpacts.flatMap((i) => i.dependsOn))];

    await this.publishEvent(SaasHealthAggregateEvent.CHANGED, workspaceId, level, previousLevel, healthScore);

    if (!wasHealthy && isHealthy) {
      const openIncident = await this.repository.findOpenIncident(workspaceId);
      if (openIncident) {
        const resolvedAt = new Date();
        await this.repository.updateIncident(openIncident.id, {
          status: SaasHealthAggregateIncidentStatus.RESOLVED,
          resolvedAt,
          durationMs: resolvedAt.getTime() - openIncident.openedAt.getTime(),
        });
      }
      await this.recordAudit(workspaceId, 'saas-health.restored', AuditActionCategory.UPDATE);
      await this.publishEvent(SaasHealthAggregateEvent.RESTORED, workspaceId, level, previousLevel, healthScore, openIncident?.id);
      return;
    }

    if (wasHealthy && !isHealthy) {
      const incident = await this.repository.createIncident({
        workspaceId,
        severity: level,
        status: SaasHealthAggregateIncidentStatus.OPEN,
        triggerSummary: safeSummary,
        affectedModules,
        cascadingFrom,
      });
      const event = level === SaasHealthLevel.UNHEALTHY || level === SaasHealthLevel.OFFLINE ? SaasHealthAggregateEvent.FAILED : SaasHealthAggregateEvent.DEGRADED;
      await this.recordAudit(workspaceId, `saas-health.${level.toLowerCase()}`, AuditActionCategory.UPDATE);
      await this.publishEvent(event, workspaceId, level, previousLevel, healthScore, incident.id);
      return;
    }

    const openIncident = await this.repository.findOpenIncident(workspaceId);
    if (openIncident) {
      await this.repository.updateIncident(openIncident.id, { severity: level, triggerSummary: safeSummary, affectedModules, cascadingFrom });
    }
    const event = level === SaasHealthLevel.UNHEALTHY || level === SaasHealthLevel.OFFLINE ? SaasHealthAggregateEvent.FAILED : SaasHealthAggregateEvent.DEGRADED;
    await this.recordAudit(workspaceId, `saas-health.${level.toLowerCase()}`, AuditActionCategory.UPDATE);
    await this.publishEvent(event, workspaceId, level, previousLevel, healthScore, openIncident?.id);
  }

  private async recordAudit(workspaceId: string, action: string, actionCategory: AuditActionCategory): Promise<void> {
    await this.auditLogsService.record({
      workspaceId,
      actorType: ActivityActorType.SYSTEM,
      action,
      actionCategory,
      module: SAAS_HEALTH_MODULE,
      entityType: 'SaasHealthTenant',
      entityId: workspaceId,
      outcome: ActivityOutcome.SUCCESS,
    });
  }

  private async publishEvent(
    event: SaasHealthAggregateEvent,
    workspaceId: string,
    level: SaasHealthLevel,
    previousLevel: SaasHealthLevel,
    healthScore: number,
    incidentId?: string,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, level, previousLevel, healthScore, incidentId });
  }
}
