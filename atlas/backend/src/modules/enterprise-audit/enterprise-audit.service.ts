import { Injectable, Logger } from '@nestjs/common';
import { PermissionAction } from '@modules/roles-permissions/interfaces';
import { AuditLogsRepository, IAuditPlatformWideFilter } from '@modules/audit-logs/audit-logs.repository';
import { IAuditLogEntry } from '@modules/audit-logs/interfaces';
import { SaasAuditService } from '@modules/saas-audit/saas-audit.service';
import { ISaasSecurityIncident } from '@modules/saas-audit/interfaces';
import { SaasAuditRequiredReasonDto } from '@modules/saas-audit/dto';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { EnterpriseAuditValidator } from './enterprise-audit.validator';
import { EnterpriseAuditEventQueue } from './jobs';
import {
  EnterpriseAuditTrailFilterDto,
  ExportEnterpriseAuditTrailDto,
  EnterpriseIncidentFilterDto,
  PaginatedEnterpriseAuditTrailResponseDto,
  EnterpriseAuditExportResponseDto,
  PaginatedEnterpriseSecurityIncidentResponseDto,
  EnterpriseAuditSweepResultResponseDto,
} from './dto';
import { EnterpriseAuditEvent } from './interfaces';
import { EnterpriseAuditIncidentNotFoundException, EnterpriseAuditIncidentOutOfScopeException } from './exceptions/enterprise-audit.exceptions';
import {
  ENTERPRISE_AUDIT_TRAIL_RESOURCE,
  ENTERPRISE_AUDIT_INCIDENT_RESOURCE,
  ENTERPRISE_AUDIT_MAX_EXPORT_ROWS,
  ENTERPRISE_AUDIT_SWEEP_WORKSPACE_LIMIT,
} from './constants';

/**
 * EnterpriseAuditService — the organization-admin, cross-business/
 * cross-workspace-within-one-organization audit surface.
 *
 * Owns no audit storage or detection logic of its own: `AuditLogEntry`
 * (Audit Logs) stays the one immutable trail every module writes to, and
 * `SaasSecurityIncident` (SaaS Audit) stays the one reviewable incident
 * workflow — every method here resolves the caller's own organization
 * boundary (never platform-wide, unlike SaaS Audit's `PlatformAdminGuard`
 * surface) and then delegates straight into those modules' already-
 * exported repository/service. The one genuinely new behavior owned here
 * is the organization-scoped policy-violation sweep, which itself loops
 * over SaaS Audit's own unmodified `runDetectionSweep()` per workspace
 * rather than re-implementing detection.
 */
@Injectable()
export class EnterpriseAuditService {
  private readonly logger = new Logger(EnterpriseAuditService.name);

  constructor(
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly saasAuditService: SaasAuditService,
    private readonly workspaceRepository: WorkspaceRepository,
    private readonly validator: EnterpriseAuditValidator,
    private readonly eventQueue: EnterpriseAuditEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Trail search / export / timelines
  // ══════════════════════════════════════════════════════════════════

  async searchTrail(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_TRAIL_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId, filter.workspaceId);
    if (workspaceIds.length === 0) {
      return this.emptyTrailPage(page, limit);
    }

    const [data, total] = await this.auditLogsRepository.findAllPlatformWide(this.toPlatformFilter(filter, workspaceIds), page, limit);
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportTrail(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    dto: ExportEnterpriseAuditTrailDto,
  ): Promise<EnterpriseAuditExportResponseDto> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_TRAIL_RESOURCE, PermissionAction.EXPORT);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const format = dto.format ?? 'JSON';
    const workspaceIds = await this.resolveOrgWorkspaceIds(organizationId, dto.workspaceId);
    if (workspaceIds.length === 0) {
      return { format, count: 0, content: format === 'CSV' ? '' : '[]' };
    }

    const [rows] = await this.auditLogsRepository.findAllPlatformWide(this.toPlatformFilter(dto, workspaceIds), 1, ENTERPRISE_AUDIT_MAX_EXPORT_ROWS);
    const content = format === 'CSV' ? this.toCsv(rows) : JSON.stringify(rows, null, 2);
    return { format, count: rows.length, content };
  }

  async getEntityTimeline(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    entityType: string,
    entityId: string,
    filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    return this.searchTrail(organizationId, callerWorkspaceId, userId, legacyRole, { ...filter, entityType, entityId });
  }

  async getActorTimeline(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    actorId: string,
    filter: EnterpriseAuditTrailFilterDto,
  ): Promise<PaginatedEnterpriseAuditTrailResponseDto> {
    return this.searchTrail(organizationId, callerWorkspaceId, userId, legacyRole, { ...filter, actorId });
  }

  // ══════════════════════════════════════════════════════════════════
  // Security incidents — pure delegate to SaaS Audit's existing workflow
  // ══════════════════════════════════════════════════════════════════

  async listIncidents(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    filter: EnterpriseIncidentFilterDto,
  ): Promise<PaginatedEnterpriseSecurityIncidentResponseDto> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    return this.saasAuditService.listIncidents({ ...filter, organizationId } as any) as unknown as Promise<PaginatedEnterpriseSecurityIncidentResponseDto>;
  }

  async getIncident(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, id: string): Promise<ISaasSecurityIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.VIEW);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    return this.getIncidentInScope(organizationId, id);
  }

  async acknowledgeIncident(organizationId: string, callerWorkspaceId: string, userId: string, legacyRole: string, id: string): Promise<ISaasSecurityIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    await this.getIncidentInScope(organizationId, id);
    return this.saasAuditService.acknowledgeIncident(id, userId);
  }

  async resolveIncident(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    id: string,
    dto: SaasAuditRequiredReasonDto,
  ): Promise<ISaasSecurityIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    await this.getIncidentInScope(organizationId, id);
    return this.saasAuditService.resolveIncident(id, userId, dto);
  }

  async dismissIncident(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
    id: string,
    dto: SaasAuditRequiredReasonDto,
  ): Promise<ISaasSecurityIncident> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);
    await this.getIncidentInScope(organizationId, id);
    return this.saasAuditService.dismissIncident(id, userId, dto);
  }

  // ══════════════════════════════════════════════════════════════════
  // Policy-violation sweep — loops SaaS Audit's own unmodified detection
  // sweep over this organization's workspaces; raises no incidents itself
  // ══════════════════════════════════════════════════════════════════

  async runPolicyViolationSweep(
    organizationId: string,
    callerWorkspaceId: string,
    userId: string,
    legacyRole: string,
  ): Promise<EnterpriseAuditSweepResultResponseDto> {
    await this.validator.assertPermission(userId, callerWorkspaceId, legacyRole, ENTERPRISE_AUDIT_INCIDENT_RESOURCE, PermissionAction.MANAGE);
    await this.validator.assertOrganizationBoundary(callerWorkspaceId, organizationId);

    const workspaceIds = (await this.workspaceRepository.findIdsByOrganization(organizationId)).slice(0, ENTERPRISE_AUDIT_SWEEP_WORKSPACE_LIMIT);

    let scanned = 0;
    let incidentsCreated = 0;
    for (const workspaceId of workspaceIds) {
      const result = await this.saasAuditService.runDetectionSweep(workspaceId);
      scanned += result.scanned;
      incidentsCreated += result.incidentsCreated;
    }

    if (incidentsCreated > 0) {
      await this.publishEvent(EnterpriseAuditEvent.COMPLIANCE_ALERT_RAISED, organizationId, undefined, userId, {
        incidentsCreated,
        workspacesScanned: workspaceIds.length,
      });
      this.logger.warn(`Enterprise Audit policy sweep raised ${incidentsCreated} incident(s) across organization '${organizationId}'`);
    }

    return { organizationId, workspacesScanned: workspaceIds.length, scanned, incidentsCreated };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private helpers
  // ══════════════════════════════════════════════════════════════════

  /** Resolves the caller's whole organization to its workspace-id list, then narrows to a single requested workspace only if that workspace genuinely belongs to the organization — never lets a caller reach a workspace outside their own org via this filter. */
  private async resolveOrgWorkspaceIds(organizationId: string, requestedWorkspaceId?: string): Promise<string[]> {
    const orgWorkspaceIds = await this.workspaceRepository.findIdsByOrganization(organizationId);
    if (!requestedWorkspaceId) return orgWorkspaceIds;
    return orgWorkspaceIds.includes(requestedWorkspaceId) ? [requestedWorkspaceId] : [];
  }

  private toPlatformFilter(filter: EnterpriseAuditTrailFilterDto, workspaceIds: string[]): IAuditPlatformWideFilter {
    return {
      workspaceId: workspaceIds,
      module: filter.module,
      action: filter.action,
      actionCategory: filter.actionCategory,
      actorType: filter.actorType,
      actorId: filter.actorId,
      entityType: filter.entityType,
      entityId: filter.entityId,
      businessId: filter.businessId,
      outcome: filter.outcome,
      riskLevel: filter.riskLevel,
      flagged: filter.flagged,
      search: filter.search,
      startDate: filter.startDate,
      endDate: filter.endDate,
      sortOrder: filter.sortOrder,
    };
  }

  private async getIncidentInScope(organizationId: string, id: string): Promise<ISaasSecurityIncident> {
    const incident = await this.saasAuditService.getIncident(id).catch(() => null);
    if (!incident) {
      throw new EnterpriseAuditIncidentNotFoundException(id);
    }
    if (incident.organizationId !== organizationId) {
      throw new EnterpriseAuditIncidentOutOfScopeException(id, organizationId);
    }
    return incident;
  }

  private emptyTrailPage(page: number, limit: number): PaginatedEnterpriseAuditTrailResponseDto {
    return { data: [], total: 0, page, limit, totalPages: 0 };
  }

  private async publishEvent(
    event: EnterpriseAuditEvent,
    organizationId: string,
    workspaceId: string | undefined,
    actorId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, organizationId, workspaceId, actorId, metadata });
  }

  private toCsv(rows: IAuditLogEntry[]): string {
    const columns: Array<keyof IAuditLogEntry> = [
      'id',
      'workspaceId',
      'businessId',
      'actorType',
      'actorId',
      'actorName',
      'action',
      'actionCategory',
      'module',
      'entityType',
      'entityId',
      'outcome',
      'reason',
      'riskLevel',
      'flagged',
      'flagReason',
      'correlationId',
      'traceId',
      'integrityHash',
      'createdAt',
    ];

    const escape = (value: unknown): string => {
      if (value === null || value === undefined) return '';
      const str = value instanceof Date ? value.toISOString() : String(value);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const header = columns.join(',');
    const lines = rows.map((row) => columns.map((col) => escape(row[col])).join(','));
    return [header, ...lines].join('\n');
  }
}
