import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityActorType, ActivityOutcome, AuditActionCategory } from '@modules/audit-logs/interfaces';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { NotificationsService } from '@modules/notifications/notifications.service';
import { CreateNotificationDto } from '@modules/notifications/dto';
import { NotificationPriority, NotificationTargetType, NotificationType } from '@modules/notifications/interfaces';
import { MonitoringFrameworkRepository } from './monitoring-framework.repository';
import { MonitoringFrameworkValidator } from './validator/monitoring-framework.validator';
import { MonitoringFrameworkAudit } from './audit/monitoring-framework.audit';
import { MonitoringSourceRegistry } from './registry/monitoring-source.registry';
import { MonitoringFrameworkEventQueue } from './jobs';
import {
  AiMonitoringHealthSourceAdapter,
  AnalyticsHealthSourceAdapter,
  BackupManagementSourceAdapter,
  DisasterRecoverySourceAdapter,
  MarketplaceHealthSourceAdapter,
  OperationsHealthSourceAdapter,
  SaasHealthSourceAdapter,
} from './sources';
import {
  IMonitoringAlertRule,
  IMonitoringDashboard,
  IMonitoringIncident,
  IMonitoringSignal,
  IMonitoringSlo,
  IMonitoringAlertRuleFilterOptions,
  IMonitoringIncidentFilterOptions,
  IMonitoringSloFilterOptions,
  MonitoringAlertRuleStatus,
  MonitoringAlertSeverity,
  MonitoringCorrelationEventType,
  MonitoringFrameworkEvent,
  MonitoringHealthLevel,
  MonitoringIncidentStatus,
  MonitoringSloStatus,
} from './interfaces';
import { MONITORING_FRAMEWORK_CONSTANTS, MONITORING_FRAMEWORK_MODULE, SYSTEM_ACTOR_ID } from './constants';
import {
  MonitoringAlertRuleInvalidDefinitionException,
  MonitoringAlertRuleNotFoundException,
  MonitoringIncidentInvalidStateTransitionException,
  MonitoringIncidentNotFoundException,
  MonitoringSloAlreadyExistsException,
  MonitoringSloInvalidStateTransitionException,
  MonitoringSloNotFoundException,
} from './exceptions/monitoring-framework.exceptions';
import {
  CreateMonitoringAlertRuleDto,
  CreateMonitoringSloDto,
  MonitoringAlertRuleFilterDto,
  MonitoringAlertRuleResponseDto,
  MonitoringIncidentFilterDto,
  MonitoringIncidentResponseDto,
  MonitoringSloFilterDto,
  MonitoringSloResponseDto,
  PaginatedMonitoringAlertRuleResponseDto,
  PaginatedMonitoringIncidentResponseDto,
  PaginatedMonitoringSloResponseDto,
  ResolveMonitoringIncidentDto,
  UpdateMonitoringSloDto,
} from './dto';

@Injectable()
export class MonitoringFrameworkService implements OnModuleInit {
  private readonly logger = new Logger(MonitoringFrameworkService.name);

  constructor(
    private readonly repository: MonitoringFrameworkRepository,
    private readonly validator: MonitoringFrameworkValidator,
    private readonly audit: MonitoringFrameworkAudit,
    private readonly sourceRegistry: MonitoringSourceRegistry,
    private readonly eventQueue: MonitoringFrameworkEventQueue,
    private readonly auditLogsService: AuditLogsService,
    private readonly notificationsService: NotificationsService,
    private readonly saasHealthSource: SaasHealthSourceAdapter,
    private readonly operationsHealthSource: OperationsHealthSourceAdapter,
    private readonly aiMonitoringHealthSource: AiMonitoringHealthSourceAdapter,
    private readonly analyticsHealthSource: AnalyticsHealthSourceAdapter,
    private readonly marketplaceHealthSource: MarketplaceHealthSourceAdapter,
    private readonly disasterRecoverySource: DisasterRecoverySourceAdapter,
    private readonly backupManagementSource: BackupManagementSourceAdapter,
  ) {}

  onModuleInit(): void {
    this.sourceRegistry.register(this.saasHealthSource);
    this.sourceRegistry.register(this.operationsHealthSource);
    this.sourceRegistry.register(this.aiMonitoringHealthSource);
    this.sourceRegistry.register(this.analyticsHealthSource);
    this.sourceRegistry.register(this.marketplaceHealthSource);
    this.sourceRegistry.register(this.disasterRecoverySource);
    this.sourceRegistry.register(this.backupManagementSource);
  }

  // ── SLOs ──────────────────────────────────────────────────────

  async createSlo(workspaceId: string, userId: string, userRole: string, dto: CreateMonitoringSloDto): Promise<MonitoringSloResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_slo', PermissionAction.CREATE);

    const existing = await this.repository.findActiveSlo(workspaceId, dto.service, dto.dimension);
    if (existing) {
      throw new MonitoringSloAlreadyExistsException(dto.service, dto.dimension);
    }

    const slo = await this.repository.createSlo({
      workspaceId,
      organizationId: dto.organizationId ?? null,
      service: dto.service,
      dimension: dto.dimension,
      targetValue: dto.targetValue,
      warningThreshold: dto.warningThreshold,
      criticalThreshold: dto.criticalThreshold,
      windowMinutes: dto.windowMinutes ?? 60,
      version: 1,
      status: MonitoringSloStatus.DRAFT,
      metadata: dto.metadata ?? {},
      createdBy: userId,
      updatedBy: userId,
    });

    await this.audit.logSloChange(slo, 'Created', userId);
    await this.publishEvent(MonitoringFrameworkEvent.SLO_CREATED, { workspaceId, sloId: slo.id, performedBy: userId });
    await this.recordCentralAudit('monitoring_framework.slo.created', workspaceId, userId, { service: slo.service, dimension: slo.dimension });
    return MonitoringSloResponseDto.from(slo as unknown as Record<string, unknown>);
  }

  async updateSlo(id: string, workspaceId: string, userId: string, userRole: string, dto: UpdateMonitoringSloDto): Promise<MonitoringSloResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_slo', PermissionAction.UPDATE);
    const existing = await this.requireSlo(id, workspaceId);

    const raw = await this.repository.updateSlo(id, {
      ...(dto.targetValue !== undefined && { targetValue: dto.targetValue }),
      ...(dto.warningThreshold !== undefined && { warningThreshold: dto.warningThreshold }),
      ...(dto.criticalThreshold !== undefined && { criticalThreshold: dto.criticalThreshold }),
      ...(dto.windowMinutes !== undefined && { windowMinutes: dto.windowMinutes }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata }),
      version: existing.version + 1,
      updatedBy: userId,
    });

    await this.audit.logSloChange(raw, dto.changeReason ?? 'Updated', userId);
    await this.publishEvent(MonitoringFrameworkEvent.SLO_UPDATED, { workspaceId, sloId: id, performedBy: userId });
    return MonitoringSloResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async activateSlo(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringSloResponseDto> {
    return this.transitionSlo(id, workspaceId, userId, userRole, MonitoringSloStatus.ACTIVE, MonitoringFrameworkEvent.SLO_ACTIVATED, 'Activated');
  }

  async pauseSlo(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringSloResponseDto> {
    return this.transitionSlo(id, workspaceId, userId, userRole, MonitoringSloStatus.PAUSED, MonitoringFrameworkEvent.SLO_PAUSED, 'Paused');
  }

  async archiveSlo(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringSloResponseDto> {
    return this.transitionSlo(id, workspaceId, userId, userRole, MonitoringSloStatus.ARCHIVED, MonitoringFrameworkEvent.SLO_ARCHIVED, 'Archived');
  }

  async restoreSlo(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringSloResponseDto> {
    return this.transitionSlo(id, workspaceId, userId, userRole, MonitoringSloStatus.DRAFT, MonitoringFrameworkEvent.SLO_UPDATED, 'Restored');
  }

  private async transitionSlo(
    id: string,
    workspaceId: string,
    userId: string,
    userRole: string,
    to: MonitoringSloStatus,
    event: MonitoringFrameworkEvent,
    reason: string,
  ): Promise<MonitoringSloResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_slo', PermissionAction.UPDATE);
    const existing = await this.requireSlo(id, workspaceId);
    const allowed = MONITORING_FRAMEWORK_CONSTANTS.ALLOWED_SLO_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(to)) {
      throw new MonitoringSloInvalidStateTransitionException(existing.status, to);
    }
    const raw = await this.repository.updateSlo(id, { status: to, updatedBy: userId });
    await this.audit.logSloChange(raw, reason, userId);
    await this.publishEvent(event, { workspaceId, sloId: id, performedBy: userId });
    return MonitoringSloResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async findSloById(id: string, workspaceId?: string): Promise<MonitoringSloResponseDto> {
    return MonitoringSloResponseDto.from((await this.requireSlo(id, workspaceId)) as unknown as Record<string, unknown>);
  }

  async findSlos(workspaceId: string, filter: MonitoringSloFilterDto): Promise<PaginatedMonitoringSloResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findSlos({ ...filter, workspaceId } as IMonitoringSloFilterOptions);
    return PaginatedMonitoringSloResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  // ── Alert rules ───────────────────────────────────────────────

  async createAlertRule(workspaceId: string, userId: string, userRole: string, dto: CreateMonitoringAlertRuleDto): Promise<MonitoringAlertRuleResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_alert_rule', PermissionAction.CREATE);

    const validation = this.validator.validateAlertRule(dto.sourceKey, dto.conditionField, dto.conditionOperator);
    if (!validation.valid) {
      throw new MonitoringAlertRuleInvalidDefinitionException(validation.issues.map((i) => i.message));
    }

    const rule = await this.repository.createAlertRule({
      workspaceId,
      sloId: dto.sloId ?? null,
      sourceKey: dto.sourceKey,
      service: dto.service ?? null,
      dimension: dto.dimension ?? null,
      conditionField: dto.conditionField,
      conditionOperator: dto.conditionOperator,
      conditionValue: dto.conditionValue as any,
      severity: dto.severity,
      cooldownMinutes: dto.cooldownMinutes ?? 15,
      notifyTargetType: dto.notifyTargetType ?? null,
      notifyTargetRef: dto.notifyTargetRef ?? null,
      status: MonitoringAlertRuleStatus.ACTIVE,
      metadata: dto.metadata ?? {},
      createdBy: userId,
    });

    await this.publishEvent(MonitoringFrameworkEvent.ALERT_RULE_CREATED, { workspaceId, alertRuleId: rule.id, performedBy: userId });
    await this.recordCentralAudit('monitoring_framework.alert_rule.created', workspaceId, userId, { sourceKey: rule.sourceKey });
    return MonitoringAlertRuleResponseDto.from(rule as unknown as Record<string, unknown>);
  }

  async findAlertRules(workspaceId: string, filter: MonitoringAlertRuleFilterDto): Promise<PaginatedMonitoringAlertRuleResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findAlertRules({ ...filter, workspaceId } as IMonitoringAlertRuleFilterOptions);
    return PaginatedMonitoringAlertRuleResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  async pauseAlertRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringAlertRuleResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_alert_rule', PermissionAction.UPDATE);
    await this.requireAlertRule(id);
    const raw = await this.repository.updateAlertRule(id, { status: MonitoringAlertRuleStatus.PAUSED });
    return MonitoringAlertRuleResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async activateAlertRule(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringAlertRuleResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_alert_rule', PermissionAction.UPDATE);
    await this.requireAlertRule(id);
    const raw = await this.repository.updateAlertRule(id, { status: MonitoringAlertRuleStatus.ACTIVE });
    return MonitoringAlertRuleResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  // ── Dashboards (aggregate read models) ───────────────────────────

  async getPlatformDashboard(): Promise<IMonitoringDashboard> {
    const sources = await this.collectAll({});
    const openIncidentCount = await this.repository.countOpenIncidents(null);
    return this.buildDashboard('PLATFORM', undefined, sources, openIncidentCount);
  }

  async getWorkspaceDashboard(workspaceId: string, callerWorkspaceId?: string): Promise<IMonitoringDashboard> {
    if (callerWorkspaceId && callerWorkspaceId !== workspaceId) {
      await this.validator.assertTenantBoundary(workspaceId);
    }
    const sources = await this.collectAll({ workspaceId });
    const openIncidentCount = await this.repository.countOpenIncidents(workspaceId);
    return this.buildDashboard('WORKSPACE', workspaceId, sources, openIncidentCount);
  }

  private async collectAll(context: { workspaceId?: string; organizationId?: string }): Promise<IMonitoringSignal[]> {
    const results = await Promise.allSettled(this.sourceRegistry.getAll().map((adapter) => adapter.collect(context)));
    const signals: IMonitoringSignal[] = [];
    for (const result of results) {
      if (result.status === 'fulfilled') {
        signals.push(...result.value);
      } else {
        this.logger.warn(`Monitoring source collection failed: ${(result.reason as Error)?.message}`);
      }
    }
    return signals;
  }

  private buildDashboard(scope: 'PLATFORM' | 'WORKSPACE', workspaceId: string | undefined, sources: IMonitoringSignal[], openIncidentCount: number): IMonitoringDashboard {
    const overallLevel = this.worstLevel(sources.map((s) => s.level));
    return { scope, workspaceId, overallLevel, sources, openIncidentCount, generatedAt: new Date() };
  }

  private worstLevel(levels: MonitoringHealthLevel[]): MonitoringHealthLevel {
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

  // ── Alert evaluation (scheduler-callable) ────────────────────────

  async processAlertEvaluation(): Promise<{ evaluatedRules: number; triggeredAlerts: number; recoveredIncidents: number }> {
    let evaluatedRules = 0;
    let triggeredAlerts = 0;
    let recoveredIncidents = 0;

    for (const sourceKey of this.sourceRegistry.getSupportedKeys()) {
      const rules = await this.repository.findActiveAlertRulesForSource(sourceKey);
      if (rules.length === 0) continue;

      const adapter = this.sourceRegistry.get(sourceKey);
      if (!adapter) continue;

      for (const rule of rules) {
        evaluatedRules++;
        const signals = await adapter.collect({ workspaceId: rule.workspaceId ?? undefined });
        const relevant = rule.service ? signals.filter((s) => s.service === rule.service) : signals;
        const breached = relevant.some((s) => this.validator.evaluateAlertRule(rule, s));

        const existingIncident = await this.repository.findOpenIncident(rule.workspaceId ?? null, rule.service ?? null, rule.id);

        if (breached) {
          const inCooldown = rule.lastTriggeredAt && Date.now() - rule.lastTriggeredAt.getTime() < rule.cooldownMinutes * 60_000;
          if (!inCooldown) {
            await this.triggerAlert(rule, relevant.find((s) => this.validator.evaluateAlertRule(rule, s))!, existingIncident);
            triggeredAlerts++;
          }
        } else if (existingIncident) {
          await this.autoResolveIncident(existingIncident);
          recoveredIncidents++;
        }
      }
    }

    return { evaluatedRules, triggeredAlerts, recoveredIncidents };
  }

  private async triggerAlert(rule: IMonitoringAlertRule, signal: IMonitoringSignal, existingIncident: IMonitoringIncident | null): Promise<void> {
    await this.repository.updateAlertRule(rule.id, { lastTriggeredAt: new Date() });
    await this.publishEvent(MonitoringFrameworkEvent.ALERT_TRIGGERED, {
      workspaceId: rule.workspaceId,
      alertRuleId: rule.id,
      metadata: { sourceKey: signal.sourceKey, level: signal.level },
    });

    if (existingIncident) {
      return; // already open — cooldown/re-trigger tracked via lastTriggeredAt only
    }

    const incident = await this.repository.createIncident({
      workspaceId: rule.workspaceId ?? null,
      sourceKeys: [signal.sourceKey],
      service: rule.service ?? signal.service ?? null,
      alertRuleId: rule.id,
      severity: rule.severity,
      status: MonitoringIncidentStatus.OPEN,
      title: `${signal.sourceKey}${signal.service ? ` / ${signal.service}` : ''} — ${signal.level}`,
      description: signal.message ?? null,
      openedAt: new Date(),
      metadata: { conditionField: rule.conditionField, conditionOperator: rule.conditionOperator },
    });

    await this.audit.logIncidentChange(incident, 'Opened by alert rule', SYSTEM_ACTOR_ID);
    await this.publishEvent(MonitoringFrameworkEvent.INCIDENT_OPENED, { workspaceId: rule.workspaceId, incidentId: incident.id, status: incident.status });
    await this.recordCentralAudit('monitoring_framework.incident.opened', rule.workspaceId ?? 'platform', SYSTEM_ACTOR_ID, { alertRuleId: rule.id });

    if (rule.notifyTargetType) {
      await this.notifyIncident(rule, incident);
    }
  }

  private async autoResolveIncident(incident: IMonitoringIncident): Promise<void> {
    const resolved = await this.repository.updateIncident(incident.id, {
      status: MonitoringIncidentStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: SYSTEM_ACTOR_ID,
      resolution: 'Auto-resolved — underlying signal recovered',
      durationMs: Date.now() - incident.openedAt.getTime(),
    });
    await this.audit.logIncidentChange(resolved, 'Auto-resolved (recovery detected)', SYSTEM_ACTOR_ID);
    await this.publishEvent(MonitoringFrameworkEvent.RECOVERY_DETECTED, { workspaceId: incident.workspaceId, incidentId: incident.id });
    await this.publishEvent(MonitoringFrameworkEvent.INCIDENT_RESOLVED, { workspaceId: incident.workspaceId, incidentId: incident.id, status: resolved.status });
  }

  private async notifyIncident(rule: IMonitoringAlertRule, incident: IMonitoringIncident): Promise<void> {
    if (!rule.workspaceId) {
      return; // platform-wide alert rules have no single workspace to notify into
    }
    try {
      const dto: CreateNotificationDto = {
        workspaceId: rule.workspaceId,
        targetType: (rule.notifyTargetType as NotificationTargetType) ?? NotificationTargetType.ROLE,
        targetUserId: rule.notifyTargetType === NotificationTargetType.USER ? (rule.notifyTargetRef ?? undefined) : undefined,
        targetRole: rule.notifyTargetType === NotificationTargetType.ROLE ? (rule.notifyTargetRef ?? undefined) : undefined,
        type: incident.severity === MonitoringAlertSeverity.CRITICAL ? NotificationType.ERROR : NotificationType.WARNING,
        category: MONITORING_FRAMEWORK_MODULE,
        priority: incident.severity === MonitoringAlertSeverity.CRITICAL ? NotificationPriority.URGENT : NotificationPriority.HIGH,
        title: incident.title,
        message: incident.description ?? `Monitoring alert triggered for ${incident.service ?? incident.sourceKeys.join(', ')}`,
        sourceModule: MONITORING_FRAMEWORK_MODULE,
        entityType: 'MonitoringIncident',
        entityId: incident.id,
        metadata: { alertRuleId: rule.id, incidentId: incident.id },
      };
      await this.notificationsService.create(dto);
    } catch (err) {
      this.logger.warn(`Failed to notify for monitoring incident '${incident.id}': ${(err as Error).message}`);
    }
  }

  /** Multiple distinct sources simultaneously DEGRADED/UNHEALTHY for the same workspace, correlated into a single incident. */
  async detectCascadingFailures(workspaceId: string): Promise<{ detected: boolean; incidentId?: string }> {
    const signals = await this.collectAll({ workspaceId });
    const unhealthySources = new Set(
      signals.filter((s) => s.level === MonitoringHealthLevel.DEGRADED || s.level === MonitoringHealthLevel.UNHEALTHY || s.level === MonitoringHealthLevel.OFFLINE).map((s) => s.sourceKey),
    );

    if (unhealthySources.size < MONITORING_FRAMEWORK_CONSTANTS.CASCADING_FAILURE_SOURCE_THRESHOLD) {
      return { detected: false };
    }

    const sourceKeys = Array.from(unhealthySources);
    const incident = await this.repository.createIncident({
      workspaceId,
      sourceKeys,
      severity: MonitoringAlertSeverity.CRITICAL,
      status: MonitoringIncidentStatus.OPEN,
      title: `Cascading failure across ${sourceKeys.length} monitoring sources`,
      description: `Sources reporting degraded/unhealthy: ${sourceKeys.join(', ')}`,
      openedAt: new Date(),
      metadata: { cascading: true },
    });

    await this.audit.logIncidentChange(incident, 'Opened — cascading failure detected', SYSTEM_ACTOR_ID);
    await this.publishEvent(MonitoringFrameworkEvent.CASCADING_FAILURE_DETECTED, { workspaceId, incidentId: incident.id, metadata: { sourceKeys } });
    await this.publishEvent(MonitoringFrameworkEvent.INCIDENT_OPENED, { workspaceId, incidentId: incident.id, status: incident.status });
    return { detected: true, incidentId: incident.id };
  }

  // ── Incident lifecycle ────────────────────────────────────────

  async acknowledgeIncident(id: string, workspaceId: string, userId: string, userRole: string): Promise<MonitoringIncidentResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_incident', PermissionAction.UPDATE);
    const incident = await this.requireIncident(id);
    if (incident.status !== MonitoringIncidentStatus.OPEN) {
      throw new MonitoringIncidentInvalidStateTransitionException(incident.status, 'acknowledge');
    }
    const raw = await this.repository.updateIncident(id, { status: MonitoringIncidentStatus.ACKNOWLEDGED, acknowledgedAt: new Date(), acknowledgedBy: userId });
    await this.audit.logIncidentChange(raw, 'Acknowledged', userId);
    await this.publishEvent(MonitoringFrameworkEvent.INCIDENT_ACKNOWLEDGED, { workspaceId, incidentId: id, performedBy: userId });
    return MonitoringIncidentResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async resolveIncident(id: string, workspaceId: string, userId: string, userRole: string, dto: ResolveMonitoringIncidentDto): Promise<MonitoringIncidentResponseDto> {
    await this.validator.assertPermission(userId, workspaceId, userRole, 'monitoring_incident', PermissionAction.UPDATE);
    const incident = await this.requireIncident(id);
    if (incident.status === MonitoringIncidentStatus.RESOLVED) {
      return MonitoringIncidentResponseDto.from(incident as unknown as Record<string, unknown>);
    }
    const raw = await this.repository.updateIncident(id, {
      status: MonitoringIncidentStatus.RESOLVED,
      resolvedAt: new Date(),
      resolvedBy: userId,
      resolution: dto.resolution ?? null,
      durationMs: Date.now() - incident.openedAt.getTime(),
    });
    await this.audit.logIncidentChange(raw, dto.resolution ?? 'Resolved', userId);
    await this.publishEvent(MonitoringFrameworkEvent.INCIDENT_RESOLVED, { workspaceId, incidentId: id, performedBy: userId });
    await this.recordCentralAudit('monitoring_framework.incident.resolved', workspaceId, userId, { incidentId: id });
    return MonitoringIncidentResponseDto.from(raw as unknown as Record<string, unknown>);
  }

  async findIncidents(workspaceId: string, filter: MonitoringIncidentFilterDto): Promise<PaginatedMonitoringIncidentResponseDto> {
    const page = filter.page ?? 1;
    const limit = Math.min(filter.limit ?? MONITORING_FRAMEWORK_CONSTANTS.DEFAULT_PAGE_SIZE, MONITORING_FRAMEWORK_CONSTANTS.MAX_PAGE_SIZE);
    const [items, total] = await this.repository.findIncidents({ ...filter, workspaceId } as IMonitoringIncidentFilterOptions);
    return PaginatedMonitoringIncidentResponseDto.from(items as unknown as Record<string, unknown>[], total, page, limit);
  }

  async getIncidentById(id: string): Promise<MonitoringIncidentResponseDto> {
    return MonitoringIncidentResponseDto.from((await this.requireIncident(id)) as unknown as Record<string, unknown>);
  }

  // ── Correlation tracking ─────────────────────────────────────────

  async recordCorrelationEvent(correlationId: string, module: string, eventType: MonitoringCorrelationEventType, workspaceId?: string, refId?: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.repository.createCorrelationEvent({ correlationId, module, eventType, workspaceId: workspaceId ?? null, refId: refId ?? null, metadata: metadata ?? {} });
  }

  async getCorrelationTrace(correlationId: string) {
    return this.repository.findCorrelationEvents(correlationId);
  }

  // ── Helpers ───────────────────────────────────────────────────

  private async requireSlo(id: string, workspaceId?: string): Promise<IMonitoringSlo> {
    const slo = await this.repository.findSloById(id);
    if (!slo) throw new MonitoringSloNotFoundException(id);
    if (workspaceId !== undefined && slo.workspaceId !== null && slo.workspaceId !== workspaceId) {
      throw new MonitoringSloNotFoundException(id);
    }
    return slo;
  }

  private async requireAlertRule(id: string): Promise<IMonitoringAlertRule> {
    const rule = await this.repository.findAlertRuleById(id);
    if (!rule) throw new MonitoringAlertRuleNotFoundException(id);
    return rule;
  }

  private async requireIncident(id: string): Promise<IMonitoringIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident) throw new MonitoringIncidentNotFoundException(id);
    return incident;
  }

  private async publishEvent(
    event: MonitoringFrameworkEvent,
    fields: { workspaceId?: string | null; sloId?: string; alertRuleId?: string; incidentId?: string; status?: string; performedBy?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    await this.eventQueue.publish({
      event,
      workspaceId: fields.workspaceId ?? null,
      sloId: fields.sloId,
      alertRuleId: fields.alertRuleId,
      incidentId: fields.incidentId,
      status: fields.status,
      performedBy: fields.performedBy,
      metadata: fields.metadata,
      timestamp: new Date(),
    });
  }

  private async recordCentralAudit(action: string, workspaceId: string, performedBy?: string, metadata?: Record<string, unknown>): Promise<void> {
    try {
      await this.auditLogsService.record({
        workspaceId,
        actorType: ActivityActorType.USER,
        actorId: performedBy,
        action,
        actionCategory: AuditActionCategory.CONFIGURATION,
        module: MONITORING_FRAMEWORK_MODULE,
        entityType: 'MonitoringFramework',
        outcome: ActivityOutcome.SUCCESS,
        metadata,
      });
    } catch (err) {
      this.logger.warn(`Failed to record central audit entry for '${action}': ${(err as Error).message}`);
    }
  }
}
