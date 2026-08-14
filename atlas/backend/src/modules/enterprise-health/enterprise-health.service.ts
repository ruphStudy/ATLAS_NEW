import { Injectable, Logger } from '@nestjs/common';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { MonitoringFrameworkService } from '@modules/monitoring-framework/monitoring-framework.service';
import { IMonitoringSignal, MonitoringHealthLevel as MfMonitoringHealthLevel } from '@modules/monitoring-framework/interfaces';
import { EnterpriseAuditService } from '@modules/enterprise-audit/enterprise-audit.service';
import { AuditRiskLevel, SaasIncidentStatus } from '@modules/saas-audit/interfaces';
import { EnterpriseWorkflowEngineService } from '@modules/enterprise-workflow-engine/enterprise-workflow-engine.service';
import { WorkflowTriggerType } from '@modules/enterprise-workflow-engine/interfaces';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationPriority, NotificationTargetType, NotificationType } from '@modules/notifications/interfaces';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { MultiBusinessService } from '@modules/multi-business/multi-business.service';
import { EnterpriseHealthRepository } from './enterprise-health.repository';
import { EnterpriseHealthValidator } from './enterprise-health.validator';
import { EnterpriseHealthEventQueue } from './jobs';
import { EnterpriseHealthIncidentFilterDto, RunEnterpriseHealthSweepDto } from './dto';
import {
  EnterpriseHealthEvent,
  EnterpriseHealthIncidentStatus,
  EnterpriseHealthScope,
  IEnterpriseHealthIncident,
  IEnterpriseHealthScoreBreakdown,
  MonitoringAlertSeverity,
  MonitoringHealthLevel,
} from './interfaces';
import {
  EnterpriseHealthIncidentInvalidStateTransitionException,
  EnterpriseHealthIncidentNotFoundException,
} from './exceptions/enterprise-health.exceptions';
import {
  ENTERPRISE_HEALTH_CONSTANTS,
  ENTERPRISE_HEALTH_DASHBOARD_RESOURCE,
  ENTERPRISE_HEALTH_INCIDENT_RESOURCE,
  ENTERPRISE_HEALTH_MODULE,
  SYSTEM_ACTOR_ID,
} from './constants';

interface IReasonDto {
  reason: string;
}

/**
 * EnterpriseHealthService — the organization-admin, cross-business/
 * cross-workspace/cross-region/cross-provider health surface.
 *
 * Owns no signal collection of its own: `IMonitoringSignal`s always come
 * from `MonitoringFrameworkService.getWorkspaceDashboard()` (never
 * re-gathered), security posture comes from `EnterpriseAuditService`'s
 * already-existing incident visibility, and critical dependency readiness
 * is read off the already-aggregated `DISASTER_RECOVERY`/
 * `BACKUP_MANAGEMENT` monitoring signals rather than calling those
 * modules a second time. What's genuinely new and owned only here: the
 * composite enterprise health score, organization/business/region/
 * provider-scoped dashboards and their append-only history, and
 * `EnterpriseHealthIncident` — a correlated incident spanning more than
 * one workspace within an organization (cascading failure, regional
 * impact, provider outage, critical dependency failure), optionally
 * triggering an Enterprise Workflow Engine execution when configured by
 * the caller.
 */
@Injectable()
export class EnterpriseHealthService {
  private readonly logger = new Logger(EnterpriseHealthService.name);

  constructor(
    private readonly repository: EnterpriseHealthRepository,
    private readonly validator: EnterpriseHealthValidator,
    private readonly monitoringFrameworkService: MonitoringFrameworkService,
    private readonly enterpriseAuditService: EnterpriseAuditService,
    private readonly enterpriseWorkflowEngineService: EnterpriseWorkflowEngineService,
    private readonly notificationsService: NotificationsService,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly multiBusinessService: MultiBusinessService,
    private readonly eventQueue: EnterpriseHealthEventQueue,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Dashboards
  // ══════════════════════════════════════════════════════════════════

  async getOrganizationDashboard(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId);
    const signals = await this.collectSignalsForWorkspaces(workspaceIds);
    return this.buildAndPersistDashboard(organizationId, EnterpriseHealthScope.ORGANIZATION, null, signals, callerWorkspaceId, userId, legacyRole);
  }

  async getBusinessDashboard(organizationId: string, businessId: string, callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const business = await this.multiBusinessService.findBusinessById(businessId);
    const workspaceIds = business.organizationId === organizationId ? (business.workspaceIds ?? []) : [];
    const signals = await this.collectSignalsForWorkspaces(workspaceIds);
    return this.buildAndPersistDashboard(organizationId, EnterpriseHealthScope.BUSINESS, businessId, signals, callerWorkspaceId, userId, legacyRole);
  }

  async getWorkspaceDashboard(organizationId: string, workspaceId: string, callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const orgWorkspaceIds = await this.resolveOrgWorkspaceIds(organizationId);
    const signals = orgWorkspaceIds.includes(workspaceId) ? await this.collectSignalsForWorkspaces([workspaceId]) : [];
    return this.buildAndPersistDashboard(organizationId, EnterpriseHealthScope.WORKSPACE, workspaceId, signals, callerWorkspaceId, userId, legacyRole);
  }

  async getRegionDashboard(organizationId: string, region: string, callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId);
    const allSignals = await this.collectSignalsForWorkspaces(workspaceIds);
    const signals = allSignals.filter((s) => s.region === region);
    return this.buildAndPersistDashboard(organizationId, EnterpriseHealthScope.REGION, region, signals, callerWorkspaceId, userId, legacyRole);
  }

  async getProviderDashboard(organizationId: string, provider: string, callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId);
    const allSignals = await this.collectSignalsForWorkspaces(workspaceIds);
    const signals = allSignals.filter((s) => s.provider === provider);
    return this.buildAndPersistDashboard(organizationId, EnterpriseHealthScope.PROVIDER, provider, signals, callerWorkspaceId, userId, legacyRole);
  }

  /** Platform-wide view — deliberately requires `ADMIN`-tier permission (never the ordinary org-scoped `VIEW`) since it spans every organization, mirroring SaaS Audit's platform-admin-only surface. */
  async getPlatformDashboard(callerWorkspaceId: string, userId: string, legacyRole: string) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_DASHBOARD_RESOURCE, PermissionAction.ADMIN);

    const platform = await this.monitoringFrameworkService.getPlatformDashboard();
    return this.buildAndPersistDashboard(null, EnterpriseHealthScope.PLATFORM, null, platform.sources, callerWorkspaceId, userId, legacyRole);
  }

  // ══════════════════════════════════════════════════════════════════
  // Detection sweep — cascading failure / regional impact / provider
  // outage / critical dependency failure, across this organization
  // ══════════════════════════════════════════════════════════════════

  async runDetectionSweep(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, dto: RunEnterpriseHealthSweepDto) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId);
    const signals = await this.collectSignalsForWorkspaces(workspaceIds);
    const unhealthy = signals.filter((s) => this.isUnhealthy(s.level));

    let incidentsCreated = 0;
    let workflowsTriggered = 0;

    const trigger = async (
      scope: EnterpriseHealthScope,
      scopeRef: string | null,
      severity: MonitoringAlertSeverity,
      title: string,
      description: string,
      affected: { sourceKeys: string[]; regions: string[]; providers: string[]; workspaceIds: string[] },
    ) => {
      const result = await this.openOrSkipIncident(organizationId, callerWorkspaceId, scope, scopeRef, severity, title, description, affected);
      if (!result.created) return;
      incidentsCreated++;

      if (severity === MonitoringAlertSeverity.CRITICAL) {
        await this.notifyCriticalIncident(callerWorkspaceId, result.incident);
        if (dto.criticalIncidentWorkflowDefinitionId) {
          const triggered = await this.triggerWorkflowForIncident(callerWorkspaceId, userId, dto.criticalIncidentWorkflowDefinitionId, result.incident);
          if (triggered) workflowsTriggered++;
        }
      }
    };

    // Regional impact
    const byRegion = this.groupBy(unhealthy, (s) => s.region);
    for (const [region, group] of byRegion) {
      if (!region || group.length < ENTERPRISE_HEALTH_CONSTANTS.CASCADING_SCOPE_THRESHOLD) continue;
      await trigger(
        EnterpriseHealthScope.REGION,
        region,
        MonitoringAlertSeverity.CRITICAL,
        `Regional impact detected in '${region}'`,
        `${group.length} degraded/unhealthy/offline signals in region '${region}'`,
        this.summarizeAffected(group),
      );
    }

    // Provider outage
    const byProvider = this.groupBy(unhealthy, (s) => s.provider);
    for (const [provider, group] of byProvider) {
      if (!provider || group.length < ENTERPRISE_HEALTH_CONSTANTS.CASCADING_SCOPE_THRESHOLD) continue;
      await trigger(
        EnterpriseHealthScope.PROVIDER,
        provider,
        MonitoringAlertSeverity.CRITICAL,
        `Provider outage detected for '${provider}'`,
        `${group.length} degraded/unhealthy/offline signals for provider '${provider}'`,
        this.summarizeAffected(group),
      );
    }

    // Organization-wide cascading failure (distinct source keys threshold, mirrors Monitoring Framework's per-workspace cascading detection at enterprise scope)
    const distinctSourceKeys = new Set(unhealthy.map((s) => s.sourceKey));
    if (distinctSourceKeys.size >= ENTERPRISE_HEALTH_CONSTANTS.CASCADING_SCOPE_THRESHOLD) {
      await trigger(
        EnterpriseHealthScope.ORGANIZATION,
        null,
        MonitoringAlertSeverity.CRITICAL,
        `Cascading failure across ${distinctSourceKeys.size} monitoring sources`,
        `Sources reporting degraded/unhealthy/offline: ${Array.from(distinctSourceKeys).join(', ')}`,
        this.summarizeAffected(unhealthy),
      );
    }

    // Critical dependency failure — disaster recovery / backup readiness
    const dependencySignals = unhealthy.filter((s) => s.sourceKey === 'DISASTER_RECOVERY' || s.sourceKey === 'BACKUP_MANAGEMENT');
    if (dependencySignals.length > 0) {
      await trigger(
        EnterpriseHealthScope.ORGANIZATION,
        null,
        MonitoringAlertSeverity.CRITICAL,
        'Critical dependency failure — recovery readiness degraded',
        `Disaster recovery / backup readiness signals unhealthy: ${dependencySignals.map((s) => s.sourceKey).join(', ')}`,
        this.summarizeAffected(dependencySignals),
      );
    }

    return { organizationId, workspacesScanned: workspaceIds.length, incidentsCreated, workflowsTriggered };
  }

  // ══════════════════════════════════════════════════════════════════
  // Incident lifecycle
  // ══════════════════════════════════════════════════════════════════

  async listIncidents(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, filter: EnterpriseHealthIncidentFilterDto) {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_INCIDENT_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? ENTERPRISE_HEALTH_CONSTANTS.DEFAULT_PAGE_SIZE, ENTERPRISE_HEALTH_CONSTANTS.MAX_PAGE_SIZE);
    const [data, total] = await this.repository.findAllIncidents({ ...filter, organizationId, page, limit });
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncident(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, id: string): Promise<IEnterpriseHealthIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_INCIDENT_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    return this.requireIncidentInScope(organizationId, id);
  }

  async acknowledgeIncident(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, id: string): Promise<IEnterpriseHealthIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    const incident = await this.requireIncidentInScope(organizationId, id);
    if (incident.status !== EnterpriseHealthIncidentStatus.OPEN) {
      throw new EnterpriseHealthIncidentInvalidStateTransitionException(incident.status, EnterpriseHealthIncidentStatus.ACKNOWLEDGED);
    }
    const updated = await this.repository.updateIncident(id, { status: EnterpriseHealthIncidentStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedBy: userId });
    await this.publishEvent(EnterpriseHealthEvent.INCIDENT_ACKNOWLEDGED, { organizationId, scope: updated.scope, scopeRef: updated.scopeRef, incidentId: id });
    return updated;
  }

  async resolveIncident(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, id: string, dto: IReasonDto): Promise<IEnterpriseHealthIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_HEALTH_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    const incident = await this.requireIncidentInScope(organizationId, id);
    if (incident.status === EnterpriseHealthIncidentStatus.RESOLVED) {
      return incident;
    }
    const updated = await this.repository.updateIncident(id, {
      status: EnterpriseHealthIncidentStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: dto.reason,
    });
    await this.publishEvent(EnterpriseHealthEvent.INCIDENT_RESOLVED, { organizationId, scope: updated.scope, scopeRef: updated.scopeRef, incidentId: id });
    await this.recordCentralAudit('enterprise_health.incident.resolved', callerWorkspaceId, userId, { incidentId: id, organizationId });
    return updated;
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — signal collection
  // ══════════════════════════════════════════════════════════════════

  private async resolveOrgWorkspaceIds(organizationId: string): Promise<string[]> {
    const ids = await this.workspaceRepository.findIdsByOrganization(organizationId);
    return ids.slice(0, ENTERPRISE_HEALTH_CONSTANTS.MAX_WORKSPACES_PER_SWEEP);
  }

  /** Never re-gathers underlying signals — reuses `MonitoringFrameworkService.getWorkspaceDashboard()` per workspace and merges the already-computed `sources`. */
  private async collectSignalsForWorkspaces(workspaceIds: string[]): Promise<IMonitoringSignal[]> {
    const results = await Promise.allSettled(workspaceIds.map((id) => this.monitoringFrameworkService.getWorkspaceDashboard(id)));
    const signals: IMonitoringSignal[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        signals.push(...result.value.sources);
      } else {
        this.logger.warn(`Enterprise Health signal collection failed for a workspace: ${(result.reason as Error)?.message}`);
      }
    }
    return signals;
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — dashboard build, scoring, persistence
  // ══════════════════════════════════════════════════════════════════

  private async buildAndPersistDashboard(
    organizationId: string | null,
    scope: EnterpriseHealthScope,
    scopeRef: string | null,
    signals: IMonitoringSignal[],
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
  ) {
    const { openSecurityIncidents, highRiskSecurityIncidents } = await this.getSecurityIncidentCounts(organizationId, callerWorkspaceId, userId, legacyRole);
    const breakdown = this.computeScoreBreakdown(signals, openSecurityIncidents, highRiskSecurityIncidents);
    const level = this.deriveLevel(signals);
    const unhealthySourceKeys = Array.from(new Set(signals.filter((s) => this.isUnhealthy(s.level)).map((s) => s.sourceKey)));

    const previous = organizationId ? await this.repository.findLatestSnapshot(organizationId, scope, scopeRef) : null;
    const previousLevel = (previous?.level as MonitoringHealthLevel | undefined) ?? null;

    await this.repository.createSnapshot({
      organizationId,
      scope,
      scopeRef,
      level,
      previousLevel,
      score: breakdown.score,
      availabilityScore: breakdown.availabilityScore,
      latencyScore: breakdown.latencyScore,
      failureScore: breakdown.failureScore,
      backlogScore: breakdown.backlogScore,
      dependencyScore: breakdown.dependencyScore,
      securityScore: breakdown.securityScore,
      recoveryScore: breakdown.recoveryScore,
      unhealthySourceKeys,
      metadata: { signalCount: signals.length },
    });

    if (organizationId) {
      await this.publishTransitionEvents(organizationId, scope, scopeRef, level, previousLevel, breakdown.score);
    }

    const openIncidentCount = organizationId ? await this.repository.countOpenIncidentsForScope(organizationId, scope, scopeRef) : 0;

    return {
      scope,
      organizationId,
      scopeRef,
      level,
      previousLevel,
      breakdown,
      openIncidentCount,
      unhealthySourceKeys,
      generatedAt: new Date(),
    };
  }

  private async getSecurityIncidentCounts(
    organizationId: string | null,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
  ): Promise<{ openSecurityIncidents: number; highRiskSecurityIncidents: number }> {
    if (!organizationId) return { openSecurityIncidents: 0, highRiskSecurityIncidents: 0 };
    try {
      const [openPage, highRiskPage] = await Promise.all([
        this.enterpriseAuditService.listIncidents(organizationId, callerWorkspaceId, userId, legacyRole, { status: SaasIncidentStatus.OPEN, limit: 1 } as any),
        this.enterpriseAuditService.listIncidents(organizationId, callerWorkspaceId, userId, legacyRole, {
          status: SaasIncidentStatus.OPEN,
          severity: AuditRiskLevel.HIGH_RISK,
          limit: 1,
        } as any),
      ]);
      return { openSecurityIncidents: openPage.total, highRiskSecurityIncidents: highRiskPage.total };
    } catch (err) {
      this.logger.warn(`Could not read Enterprise Audit security posture for organization '${organizationId}': ${(err as Error).message}`);
      return { openSecurityIncidents: 0, highRiskSecurityIncidents: 0 };
    }
  }

  private computeScoreBreakdown(signals: IMonitoringSignal[], openSecurityIncidents: number, highRiskSecurityIncidents: number): IEnterpriseHealthScoreBreakdown {
    const weights = ENTERPRISE_HEALTH_CONSTANTS.SCORE_WEIGHTS;
    const nonMaintenance = signals.filter((s) => s.level !== MfMonitoringHealthLevel.MAINTENANCE);
    const healthyFraction = nonMaintenance.length === 0 ? 1 : nonMaintenance.filter((s) => s.level === MfMonitoringHealthLevel.HEALTHY).length / nonMaintenance.length;

    const availabilityValues = signals.map((s) => s.availability).filter((v): v is number => v !== undefined);
    const availabilityScore = availabilityValues.length > 0 ? this.average(availabilityValues) : healthyFraction * 100;

    const latencyValues = signals.map((s) => s.latencyMs).filter((v): v is number => v !== undefined);
    const latencyScore =
      latencyValues.length > 0
        ? this.clampScore(100 - ((this.average(latencyValues) - ENTERPRISE_HEALTH_CONSTANTS.LATENCY_GOOD_MS) / (ENTERPRISE_HEALTH_CONSTANTS.LATENCY_BAD_MS - ENTERPRISE_HEALTH_CONSTANTS.LATENCY_GOOD_MS)) * 100)
        : 100;

    const errorValues = signals.map((s) => s.errorRate).filter((v): v is number => v !== undefined);
    const failureScore = errorValues.length > 0 ? this.clampScore(100 - (this.average(errorValues) / ENTERPRISE_HEALTH_CONSTANTS.FAILURE_SCALE) * 100) : healthyFraction * 100;

    const backlogValues = signals.map((s) => s.queueBacklog).filter((v): v is number => v !== undefined);
    const backlogScore = backlogValues.length > 0 ? this.clampScore(100 - (this.average(backlogValues) / ENTERPRISE_HEALTH_CONSTANTS.BACKLOG_SCALE) * 100) : 100;

    const dependencyScore = healthyFraction * 100;

    const securityScore = this.clampScore(
      100 - openSecurityIncidents * ENTERPRISE_HEALTH_CONSTANTS.SECURITY_INCIDENT_PENALTY - highRiskSecurityIncidents * ENTERPRISE_HEALTH_CONSTANTS.SECURITY_HIGH_RISK_PENALTY,
    );

    const recoverySignals = signals.filter((s) => s.sourceKey === 'DISASTER_RECOVERY' || s.sourceKey === 'BACKUP_MANAGEMENT');
    const unhealthyRecoverySignals = recoverySignals.filter((s) => this.isUnhealthy(s.level)).length;
    const recoveryScore = recoverySignals.length === 0 ? 100 : this.clampScore(100 - unhealthyRecoverySignals * ENTERPRISE_HEALTH_CONSTANTS.RECOVERY_UNHEALTHY_PENALTY);

    const score = this.clampScore(
      availabilityScore * weights.AVAILABILITY +
        latencyScore * weights.LATENCY +
        failureScore * weights.FAILURE +
        backlogScore * weights.BACKLOG +
        dependencyScore * weights.DEPENDENCY +
        securityScore * weights.SECURITY +
        recoveryScore * weights.RECOVERY,
    );

    return { score, availabilityScore, latencyScore, failureScore, backlogScore, dependencyScore, securityScore, recoveryScore };
  }

  /** Mirrors Monitoring Framework's own `worstLevel` ordering, extended with `MAINTENANCE` ranked below an active failure but above `UNKNOWN`/`HEALTHY` — a scope entirely in planned maintenance reports `MAINTENANCE`, never `HEALTHY`. */
  private deriveLevel(signals: IMonitoringSignal[]): MonitoringHealthLevel {
    if (signals.length === 0) return MonitoringHealthLevel.UNKNOWN;
    const levels = signals.map((s) => s.level as MonitoringHealthLevel);
    const order = [
      MonitoringHealthLevel.OFFLINE,
      MonitoringHealthLevel.UNHEALTHY,
      MonitoringHealthLevel.DEGRADED,
      MonitoringHealthLevel.MAINTENANCE,
      MonitoringHealthLevel.UNKNOWN,
      MonitoringHealthLevel.HEALTHY,
    ];
    for (const level of order) {
      if (levels.includes(level)) return level;
    }
    return MonitoringHealthLevel.UNKNOWN;
  }

  private isUnhealthy(level: MfMonitoringHealthLevel | MonitoringHealthLevel): boolean {
    return level === MfMonitoringHealthLevel.DEGRADED || level === MfMonitoringHealthLevel.UNHEALTHY || level === MfMonitoringHealthLevel.OFFLINE;
  }

  private async publishTransitionEvents(
    organizationId: string,
    scope: EnterpriseHealthScope,
    scopeRef: string | null,
    level: MonitoringHealthLevel,
    previousLevel: MonitoringHealthLevel | null,
    score: number,
  ): Promise<void> {
    if (previousLevel === level) return;

    await this.publishEvent(EnterpriseHealthEvent.ENTERPRISE_HEALTH_CHANGED, { organizationId, scope, scopeRef, level, previousLevel, score });

    const failureLevels = [MonitoringHealthLevel.UNHEALTHY, MonitoringHealthLevel.OFFLINE];
    if (previousLevel !== null && !failureLevels.includes(previousLevel) && failureLevels.includes(level)) {
      await this.publishEvent(EnterpriseHealthEvent.ENTERPRISE_HEALTH_FAILED, { organizationId, scope, scopeRef, level, previousLevel, score });
    } else if (level === MonitoringHealthLevel.DEGRADED) {
      await this.publishEvent(EnterpriseHealthEvent.ENTERPRISE_HEALTH_DEGRADED, { organizationId, scope, scopeRef, level, previousLevel, score });
    } else if (level === MonitoringHealthLevel.HEALTHY && previousLevel !== null && previousLevel !== MonitoringHealthLevel.HEALTHY) {
      await this.publishEvent(EnterpriseHealthEvent.ENTERPRISE_HEALTH_RESTORED, { organizationId, scope, scopeRef, level, previousLevel, score });
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — incident creation / notification / workflow trigger
  // ══════════════════════════════════════════════════════════════════

  private async openOrSkipIncident(
    organizationId: string,
    callerWorkspaceId: string,
    scope: EnterpriseHealthScope,
    scopeRef: string | null,
    severity: MonitoringAlertSeverity,
    title: string,
    description: string,
    affected: { sourceKeys: string[]; regions: string[]; providers: string[]; workspaceIds: string[] },
  ): Promise<{ incident: IEnterpriseHealthIncident; created: boolean }> {
    const existing = await this.repository.findOpenIncident(organizationId, scope, scopeRef);
    if (existing) {
      return { incident: existing, created: false };
    }

    const incident = await this.repository.createIncident({
      organizationId,
      scope,
      scopeRef,
      severity,
      status: EnterpriseHealthIncidentStatus.OPEN,
      title,
      description,
      affectedSourceKeys: affected.sourceKeys,
      affectedRegions: affected.regions,
      affectedProviders: affected.providers,
      affectedWorkspaceIds: affected.workspaceIds,
      openedAt: new Date(),
      metadata: {},
    });

    await this.publishEvent(EnterpriseHealthEvent.INCIDENT_OPENED, { organizationId, scope, scopeRef, incidentId: incident.id, metadata: { severity } });
    await this.recordCentralAudit('enterprise_health.incident.opened', callerWorkspaceId, SYSTEM_ACTOR_ID, { scope, scopeRef, severity, organizationId });
    return { incident, created: true };
  }

  private summarizeAffected(signals: IMonitoringSignal[]): { sourceKeys: string[]; regions: string[]; providers: string[]; workspaceIds: string[] } {
    return {
      sourceKeys: Array.from(new Set(signals.map((s) => s.sourceKey))),
      regions: Array.from(new Set(signals.map((s) => s.region).filter((v): v is string => !!v))),
      providers: Array.from(new Set(signals.map((s) => s.provider).filter((v): v is string => !!v))),
      workspaceIds: Array.from(new Set(signals.map((s) => s.workspaceId).filter((v): v is string => !!v))),
    };
  }

  private async notifyCriticalIncident(workspaceId: string, incident: IEnterpriseHealthIncident): Promise<void> {
    try {
      const dto: CreateNotificationDto = {
        workspaceId,
        targetType: NotificationTargetType.ROLE,
        targetRole: 'ADMIN',
        type: NotificationType.ERROR,
        category: ENTERPRISE_HEALTH_MODULE,
        priority: NotificationPriority.URGENT,
        title: incident.title,
        message: incident.description ?? `Enterprise health incident opened for scope '${incident.scope}'`,
        sourceModule: ENTERPRISE_HEALTH_MODULE,
        entityType: 'EnterpriseHealthIncident',
        entityId: incident.id,
        metadata: { incidentId: incident.id, scope: incident.scope, scopeRef: incident.scopeRef },
      };
      await this.notificationsService.create(dto);
    } catch (err) {
      this.logger.warn(`Failed to notify for enterprise health incident '${incident.id}': ${(err as Error).message}`);
    }
  }

  /** Configuration-driven: only ever runs the workflow definition id the caller supplied for this sweep — never a hardcoded reference. */
  private async triggerWorkflowForIncident(workspaceId: string, userId: string, definitionId: string, incident: IEnterpriseHealthIncident): Promise<boolean> {
    try {
      const execution = await this.enterpriseWorkflowEngineService.executeWorkflow(workspaceId, userId, {
        definitionId,
        triggerType: WorkflowTriggerType.EVENT,
        triggeredBy: ENTERPRISE_HEALTH_MODULE,
        input: { incidentId: incident.id, organizationId: incident.organizationId, scope: incident.scope, scopeRef: incident.scopeRef, severity: incident.severity },
      });
      await this.repository.updateIncident(incident.id, { triggeredWorkflowExecutionId: execution.id });
      return true;
    } catch (err) {
      this.logger.warn(`Failed to trigger Enterprise Workflow definition '${definitionId}' for incident '${incident.id}': ${(err as Error).message}`);
      return false;
    }
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — helpers
  // ══════════════════════════════════════════════════════════════════

  private async requireIncidentInScope(organizationId: string, id: string): Promise<IEnterpriseHealthIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident || incident.organizationId !== organizationId) {
      throw new EnterpriseHealthIncidentNotFoundException(id);
    }
    return incident;
  }

  private groupBy<T, K>(items: T[], keyFn: (item: T) => K | undefined): Map<K | undefined, T[]> {
    const map = new Map<K | undefined, T[]>();
    for (const item of items) {
      const key = keyFn(item);
      const list = map.get(key) ?? [];
      list.push(item);
      map.set(key, list);
    }
    return map;
  }

  private average(values: number[]): number {
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }

  private clampScore(value: number): number {
    if (Number.isNaN(value)) return 0;
    return Math.max(0, Math.min(100, value));
  }

  private async publishEvent(
    event: EnterpriseHealthEvent,
    fields: {
      organizationId?: string | null;
      scope?: EnterpriseHealthScope;
      scopeRef?: string | null;
      incidentId?: string;
      level?: MonitoringHealthLevel;
      previousLevel?: MonitoringHealthLevel | null;
      score?: number;
      metadata?: Record<string, unknown>;
    },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      organizationId: fields.organizationId,
      scope: fields.scope,
      scopeRef: fields.scopeRef,
      incidentId: fields.incidentId,
      level: fields.level,
      previousLevel: fields.previousLevel,
      score: fields.score,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: performedBy === SYSTEM_ACTOR_ID ? ActivityActorType.SYSTEM : ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: ENTERPRISE_HEALTH_MODULE,
        entityType: 'EnterpriseHealth',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
