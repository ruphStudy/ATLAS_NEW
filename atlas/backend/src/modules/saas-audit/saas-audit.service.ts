import { Inject, Injectable, Logger } from '@nestjs/common';
import { AuditLogsRepository, IAuditPlatformWideFilter } from '@modules/audit-logs/audit-logs.repository';
import { AuditLogsService } from '@modules/audit-logs/audit-logs.service';
import { ActivityOutcome, AuditActionCategory, AuditRiskLevel, IAuditLogEntry } from '@modules/audit-logs/interfaces';
import { SaasAdministrationService } from '@modules/saas-administration/saas-administration.service';
import {
  AdminActionLogFilterDto,
  ImpersonationSessionFilterDto,
  PaginatedAdminActionLogResponseDto,
  PaginatedImpersonationSessionResponseDto,
} from '@modules/saas-administration/dto';
import { WorkspaceRepository } from '@modules/workspace/workspace.repository';
import { STORAGE_PROVIDER } from '../../storage/interfaces';
import type { IStorageProvider } from '../../storage/interfaces';
import { SaasAuditRepository } from './saas-audit.repository';
import { SaasAuditEventQueue } from './jobs';
import {
  SaasAuditTrailFilterDto,
  ExportAuditTrailDto,
  SaasIncidentFilterDto,
  SaasAuditRequiredReasonDto,
  CreateAuditArchiveDto,
  SaasAuditArchiveFilterDto,
  PaginatedSaasAuditTrailResponseDto,
  SaasAuditExportResponseDto,
  PaginatedSaasSecurityIncidentResponseDto,
  PaginatedSaasAuditArchiveResponseDto,
  DetectionSweepResultResponseDto,
  RetentionPurgeResultResponseDto,
} from './dto';
import { ISaasAuditArchive, ISaasSecurityIncident, SaasAuditArchiveStatus, SaasAuditEvent, SaasIncidentStatus, SaasIncidentType } from './interfaces';
import {
  CROSS_TENANT_ACCESS_WINDOW_MS,
  CROSS_TENANT_ACCESS_WORKSPACE_THRESHOLD,
  DETECTION_SWEEP_ROW_LIMIT,
  DETECTION_SWEEP_WINDOW_MS,
  SAAS_AUDIT_DEFAULT_RETENTION_DAYS,
  SAAS_AUDIT_DESTRUCTIVE_MODULES,
  SAAS_AUDIT_MAX_EXPORT_ROWS,
  SAAS_AUDIT_PLATFORM_STORAGE_SCOPE,
} from './constants';
import {
  SaasAuditArchiveFailedException,
  SaasAuditArchiveNotFoundException,
  SaasAuditArchiveNotReadyException,
  SaasAuditIncidentNotFoundException,
  SaasAuditInvalidDateRangeException,
  SaasAuditInvalidIncidentTransitionException,
} from './exceptions/saas-audit.exceptions';

const INCIDENT_TRANSITIONS: Record<SaasIncidentStatus, SaasIncidentStatus[]> = {
  [SaasIncidentStatus.OPEN]: [SaasIncidentStatus.ACKNOWLEDGED, SaasIncidentStatus.RESOLVED, SaasIncidentStatus.DISMISSED],
  [SaasIncidentStatus.ACKNOWLEDGED]: [SaasIncidentStatus.RESOLVED, SaasIncidentStatus.DISMISSED],
  [SaasIncidentStatus.RESOLVED]: [],
  [SaasIncidentStatus.DISMISSED]: [],
};

/**
 * SaasAuditService — the platform-admin, cross-tenant security surface over
 * ATLAS's already-existing audit infrastructure. Deliberately owns NO
 * general-purpose audit writing of its own: `AuditLogEntry` (Audit Logs
 * module) remains the one central, immutable trail every module writes to,
 * and `AdminActionLog`/`ImpersonationSession` (SaaS Administration) remain
 * the authoritative cross-tenant admin-action/impersonation ledgers — this
 * service only ADDS what neither of those already does: a
 * `PlatformAdminGuard`-gated cross-tenant search over `AuditLogEntry`,
 * rule-based detection of privilege-escalation/destructive/repeated-failure/
 * cross-tenant-access patterns promoted into a reviewable
 * `SaasSecurityIncident` workflow, and genuine cold-storage archival via the
 * shared `StorageModule` (as opposed to Audit Logs' own retention purge,
 * which only ever deletes).
 */
@Injectable()
export class SaasAuditService {
  private readonly logger = new Logger(SaasAuditService.name);

  constructor(
    private readonly repository: SaasAuditRepository,
    private readonly auditLogsRepository: AuditLogsRepository,
    private readonly auditLogsService: AuditLogsService,
    private readonly saasAdministrationService: SaasAdministrationService,
    private readonly workspaceRepository: WorkspaceRepository,
    @Inject(STORAGE_PROVIDER) private readonly storageProvider: IStorageProvider,
    private readonly eventQueue: SaasAuditEventQueue,
  ) {}

  // ══════════════════════════════════════════════════════════════════
  // Cross-tenant search — audit trail, admin actions, impersonation
  // ══════════════════════════════════════════════════════════════════

  async searchAuditTrail(filter: SaasAuditTrailFilterDto): Promise<PaginatedSaasAuditTrailResponseDto> {
    const platformFilter = await this.resolvePlatformFilter(filter);
    if (platformFilter === null) {
      return this.emptyPage(filter.page, filter.limit);
    }

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const [data, total] = await this.auditLogsRepository.findAllPlatformWide(platformFilter, page, limit);
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async exportAuditTrail(dto: ExportAuditTrailDto): Promise<SaasAuditExportResponseDto> {
    const platformFilter = await this.resolvePlatformFilter(dto);
    const format = dto.format ?? 'JSON';
    if (platformFilter === null) {
      return { format, count: 0, content: format === 'CSV' ? '' : '[]' };
    }

    const [rows] = await this.auditLogsRepository.findAllPlatformWide(platformFilter, 1, SAAS_AUDIT_MAX_EXPORT_ROWS);
    const content = format === 'CSV' ? this.toCsv(rows) : JSON.stringify(rows, null, 2);
    return { format, count: rows.length, content };
  }

  /** Pure delegate — `AdminActionLog` is already the cross-tenant, immutable admin-action ledger (SaaS Administration); this only avoids callers needing to know that module exists. */
  async searchAdminActions(filter: AdminActionLogFilterDto): Promise<PaginatedAdminActionLogResponseDto> {
    return this.saasAdministrationService.listActionLog(filter);
  }

  /** Pure delegate — `ImpersonationSession` remains owned by SaaS Administration; this only surfaces it alongside the rest of the platform security view. */
  async listImpersonationSessions(filter: ImpersonationSessionFilterDto): Promise<PaginatedImpersonationSessionResponseDto> {
    return this.saasAdministrationService.listImpersonationSessions(filter);
  }

  // ══════════════════════════════════════════════════════════════════
  // Detection sweep — rule-based, explainable, no new ML/anomaly infra
  // ══════════════════════════════════════════════════════════════════

  /** Scheduler-callable (no active scheduler wired in this codebase yet) — invoke on demand via the manual sweep endpoint. Scans a rolling window rather than tracking a cursor, since `AuditLogEntry` is immutable and cannot be marked "processed"; already-promoted entries are skipped via `existsIncidentForSourceEntry`. */
  async runDetectionSweep(workspaceId?: string): Promise<DetectionSweepResultResponseDto> {
    const since = new Date(Date.now() - DETECTION_SWEEP_WINDOW_MS);
    let scanned = 0;
    let incidentsCreated = 0;

    const [permissionEntries] = await this.auditLogsRepository.findAllPlatformWide(
      { workspaceId, actionCategory: AuditActionCategory.PERMISSION, outcome: ActivityOutcome.SUCCESS, startDate: since.toISOString() },
      1,
      DETECTION_SWEEP_ROW_LIMIT,
    );
    scanned += permissionEntries.length;
    for (const entry of permissionEntries) {
      if (await this.repository.existsIncidentForSourceEntry(entry.id)) continue;
      await this.raiseIncidentFromEntry(SaasIncidentType.PRIVILEGE_ESCALATION, entry, `Successful permission-category action '${entry.action}' by ${entry.actorId ?? 'an unattributed actor'}`);
      incidentsCreated++;
    }

    const [deleteEntries] = await this.auditLogsRepository.findAllPlatformWide(
      { workspaceId, actionCategory: AuditActionCategory.DELETE, outcome: ActivityOutcome.SUCCESS, startDate: since.toISOString() },
      1,
      DETECTION_SWEEP_ROW_LIMIT,
    );
    scanned += deleteEntries.length;
    for (const entry of deleteEntries) {
      if (!SAAS_AUDIT_DESTRUCTIVE_MODULES.includes(entry.module)) continue;
      if (await this.repository.existsIncidentForSourceEntry(entry.id)) continue;
      await this.raiseIncidentFromEntry(SaasIncidentType.DESTRUCTIVE_ACTION, entry, `Destructive action '${entry.action}' in module '${entry.module}'`);
      incidentsCreated++;
    }

    const [flaggedEntries] = await this.auditLogsRepository.findAllPlatformWide({ workspaceId, flagged: true, startDate: since.toISOString() }, 1, DETECTION_SWEEP_ROW_LIMIT);
    scanned += flaggedEntries.length;
    for (const entry of flaggedEntries) {
      if (await this.repository.existsIncidentForSourceEntry(entry.id)) continue;
      await this.raiseIncidentFromEntry(SaasIncidentType.REPEATED_FAILURE, entry, entry.flagReason ?? 'Flagged by audit risk analysis');
      incidentsCreated++;
    }

    if (!workspaceId) {
      incidentsCreated += await this.detectCrossTenantAccess();
    }

    return { scanned, incidentsCreated };
  }

  // ══════════════════════════════════════════════════════════════════
  // Incident review workflow
  // ══════════════════════════════════════════════════════════════════

  async listIncidents(filter: SaasIncidentFilterDto): Promise<PaginatedSaasSecurityIncidentResponseDto> {
    const [data, total] = await this.repository.findAllIncidents(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async getIncident(id: string): Promise<ISaasSecurityIncident> {
    return this.getIncidentOrThrow(id);
  }

  async acknowledgeIncident(id: string, userId: string): Promise<ISaasSecurityIncident> {
    const incident = await this.getIncidentOrThrow(id);
    this.assertIncidentTransition(incident.status, SaasIncidentStatus.ACKNOWLEDGED);

    const updated = await this.repository.updateIncident(id, { status: SaasIncidentStatus.ACKNOWLEDGED, acknowledgedBy: userId, acknowledgedAt: new Date() });
    await this.publishEvent(SaasAuditEvent.INCIDENT_ACKNOWLEDGED, incident.workspaceId, incident.id, userId);
    return updated;
  }

  async resolveIncident(id: string, userId: string, dto: SaasAuditRequiredReasonDto): Promise<ISaasSecurityIncident> {
    const incident = await this.getIncidentOrThrow(id);
    this.assertIncidentTransition(incident.status, SaasIncidentStatus.RESOLVED);

    const updated = await this.repository.updateIncident(id, { status: SaasIncidentStatus.RESOLVED, resolvedBy: userId, resolvedAt: new Date(), resolutionNotes: dto.reason });
    await this.publishEvent(SaasAuditEvent.INCIDENT_RESOLVED, incident.workspaceId, incident.id, userId, { resolutionNotes: dto.reason });
    return updated;
  }

  async dismissIncident(id: string, userId: string, dto: SaasAuditRequiredReasonDto): Promise<ISaasSecurityIncident> {
    const incident = await this.getIncidentOrThrow(id);
    this.assertIncidentTransition(incident.status, SaasIncidentStatus.DISMISSED);

    const updated = await this.repository.updateIncident(id, { status: SaasIncidentStatus.DISMISSED, resolvedBy: userId, resolvedAt: new Date(), resolutionNotes: dto.reason });
    await this.publishEvent(SaasAuditEvent.INCIDENT_DISMISSED, incident.workspaceId, incident.id, userId, { reason: dto.reason });
    return updated;
  }

  // ══════════════════════════════════════════════════════════════════
  // Archival + retention
  // ══════════════════════════════════════════════════════════════════

  async createArchive(userId: string, dto: CreateAuditArchiveDto): Promise<ISaasAuditArchive> {
    const fromDate = new Date(dto.fromDate);
    const toDate = new Date(dto.toDate);
    if (toDate <= fromDate) {
      throw new SaasAuditInvalidDateRangeException();
    }

    const archive = await this.repository.createArchive({
      workspaceId: dto.workspaceId ?? null,
      fromDate,
      toDate,
      entryCount: 0,
      format: 'JSON',
      status: SaasAuditArchiveStatus.PENDING,
      requestedBy: userId,
    });

    try {
      const [entries] = await this.auditLogsRepository.findAllPlatformWide(
        { workspaceId: dto.workspaceId, startDate: dto.fromDate, endDate: dto.toDate },
        1,
        SAAS_AUDIT_MAX_EXPORT_ROWS,
      );

      const buffer = Buffer.from(JSON.stringify(entries, null, 2), 'utf-8');
      const upload = await this.storageProvider.upload({
        workspaceId: dto.workspaceId ?? SAAS_AUDIT_PLATFORM_STORAGE_SCOPE,
        key: `saas-audit-archives/${archive.id}.json`,
        buffer,
      });

      const completed = await this.repository.updateArchive(archive.id, {
        entryCount: entries.length,
        storageReference: upload.reference,
        status: SaasAuditArchiveStatus.COMPLETED,
        completedAt: new Date(),
      });

      await this.publishArchiveEvent(SaasAuditEvent.ARCHIVE_CREATED, dto.workspaceId ?? null, archive.id, userId, { entryCount: entries.length });
      return completed;
    } catch (error) {
      const reason = (error as Error).message;
      this.logger.error(`Audit archive '${archive.id}' failed: ${reason}`);
      await this.repository.updateArchive(archive.id, { status: SaasAuditArchiveStatus.FAILED, failureReason: reason });
      await this.publishArchiveEvent(SaasAuditEvent.ARCHIVE_FAILED, dto.workspaceId ?? null, archive.id, userId);
      throw new SaasAuditArchiveFailedException(reason);
    }
  }

  async getArchive(id: string): Promise<ISaasAuditArchive> {
    return this.getArchiveOrThrow(id);
  }

  async listArchives(filter: SaasAuditArchiveFilterDto): Promise<PaginatedSaasAuditArchiveResponseDto> {
    const [data, total] = await this.repository.findAllArchives(filter);
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    return { data: data as any, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async downloadArchive(id: string): Promise<{ buffer: Buffer; sizeBytes: number }> {
    const archive = await this.getArchiveOrThrow(id);
    if (archive.status !== SaasAuditArchiveStatus.COMPLETED || !archive.storageReference) {
      throw new SaasAuditArchiveNotReadyException(id, archive.status);
    }
    return this.storageProvider.download(archive.workspaceId ?? SAAS_AUDIT_PLATFORM_STORAGE_SCOPE, archive.storageReference);
  }

  /** Delegates the actual delete to Audit Logs' own `purgeRetention()` per affected tenant — never an unscoped cross-tenant delete, only a platform-wide DISCOVERY of which tenants have retention-eligible rows. */
  async purgeRetentionAcrossTenants(retentionDays?: number): Promise<RetentionPurgeResultResponseDto> {
    const days = retentionDays ?? SAAS_AUDIT_DEFAULT_RETENTION_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const [entries] = await this.auditLogsRepository.findAllPlatformWide({ endDate: cutoff.toISOString(), flagged: false }, 1, SAAS_AUDIT_MAX_EXPORT_ROWS);
    const workspaceIds = [...new Set(entries.map((entry) => entry.workspaceId))];

    let entriesPurged = 0;
    for (const workspaceId of workspaceIds) {
      entriesPurged += await this.auditLogsService.purgeRetention(workspaceId, days);
    }

    return { workspacesPurged: workspaceIds.length, entriesPurged };
  }

  // ══════════════════════════════════════════════════════════════════
  // Private — shared helpers
  // ══════════════════════════════════════════════════════════════════

  /** Resolves `organizationId` into a concrete workspace-id list (no `Organization` table/join exists yet — see `Workspace.organizationId`'s own doc comment) and merges it with any explicit `workspaceId`. Returns `null` when an organization filter resolves to zero workspaces, signaling "no possible matches" to the caller. */
  private async resolvePlatformFilter(filter: SaasAuditTrailFilterDto): Promise<IAuditPlatformWideFilter | null> {
    let workspaceId: string | string[] | undefined = filter.workspaceId;

    if (filter.organizationId) {
      const orgWorkspaceIds = await this.workspaceRepository.findIdsByOrganization(filter.organizationId);
      if (orgWorkspaceIds.length === 0) {
        return null;
      }
      workspaceId = filter.workspaceId ? orgWorkspaceIds.filter((id) => id === filter.workspaceId) : orgWorkspaceIds;
      if (Array.isArray(workspaceId) && workspaceId.length === 0) {
        return null;
      }
    }

    return {
      workspaceId,
      module: filter.module,
      action: filter.action,
      actionCategory: filter.actionCategory,
      actorType: filter.actorType,
      actorId: filter.actorId,
      entityType: filter.entityType,
      entityId: filter.entityId,
      outcome: filter.outcome,
      riskLevel: filter.riskLevel,
      flagged: filter.flagged,
      search: filter.search,
      startDate: filter.startDate,
      endDate: filter.endDate,
      sortOrder: filter.sortOrder,
    };
  }

  private async raiseIncidentFromEntry(incidentType: SaasIncidentType, entry: IAuditLogEntry, summary: string): Promise<void> {
    const workspace = await this.workspaceRepository.findById(entry.workspaceId).catch(() => null);

    const incident = await this.repository.createIncident({
      incidentType,
      severity: entry.riskLevel,
      workspaceId: entry.workspaceId,
      organizationId: workspace?.organizationId ?? null,
      actorId: entry.actorId ?? null,
      actorType: entry.actorType,
      sourceAuditLogEntryId: entry.id,
      relatedAuditLogEntryIds: [],
      summary,
      status: SaasIncidentStatus.OPEN,
    });

    this.logger.warn(`Security incident '${incident.id}' (${incidentType}) raised for workspace '${entry.workspaceId}': ${summary}`);
    await this.publishEvent(SaasAuditEvent.INCIDENT_DETECTED, entry.workspaceId, incident.id, entry.actorId ?? undefined, { incidentType });
  }

  private async detectCrossTenantAccess(): Promise<number> {
    const since = new Date(Date.now() - CROSS_TENANT_ACCESS_WINDOW_MS);
    const [recentEntries] = await this.auditLogsRepository.findAllPlatformWide({ startDate: since.toISOString() }, 1, SAAS_AUDIT_MAX_EXPORT_ROWS);

    const byActor = new Map<string, IAuditLogEntry[]>();
    for (const entry of recentEntries) {
      if (!entry.actorId) continue;
      const list = byActor.get(entry.actorId) ?? [];
      list.push(entry);
      byActor.set(entry.actorId, list);
    }

    let created = 0;
    for (const [actorId, entries] of byActor) {
      const distinctWorkspaces = new Set(entries.map((entry) => entry.workspaceId));
      if (distinctWorkspaces.size < CROSS_TENANT_ACCESS_WORKSPACE_THRESHOLD) continue;

      const recentIncident = await this.repository.findRecentIncidentByActorAndType(actorId, SaasIncidentType.SUSPICIOUS_CROSS_TENANT_ACCESS, since);
      if (recentIncident) continue;

      const incident = await this.repository.createIncident({
        incidentType: SaasIncidentType.SUSPICIOUS_CROSS_TENANT_ACCESS,
        severity: AuditRiskLevel.SUSPICIOUS,
        workspaceId: null,
        organizationId: null,
        actorId,
        actorType: entries[0]!.actorType,
        sourceAuditLogEntryId: entries[0]!.id,
        relatedAuditLogEntryIds: entries.map((entry) => entry.id),
        summary: `Actor '${actorId}' active across ${distinctWorkspaces.size} tenants within ${Math.round(CROSS_TENANT_ACCESS_WINDOW_MS / 60000)} minutes`,
        status: SaasIncidentStatus.OPEN,
      });

      await this.publishEvent(SaasAuditEvent.INCIDENT_DETECTED, null, incident.id, actorId, { incidentType: SaasIncidentType.SUSPICIOUS_CROSS_TENANT_ACCESS });
      created++;
    }

    return created;
  }

  private assertIncidentTransition(from: SaasIncidentStatus, to: SaasIncidentStatus): void {
    if (!INCIDENT_TRANSITIONS[from]?.includes(to)) {
      throw new SaasAuditInvalidIncidentTransitionException(from, to);
    }
  }

  private async getIncidentOrThrow(id: string): Promise<ISaasSecurityIncident> {
    const incident = await this.repository.findIncidentById(id);
    if (!incident) {
      throw new SaasAuditIncidentNotFoundException(id);
    }
    return incident;
  }

  private async getArchiveOrThrow(id: string): Promise<ISaasAuditArchive> {
    const archive = await this.repository.findArchiveById(id);
    if (!archive) {
      throw new SaasAuditArchiveNotFoundException(id);
    }
    return archive;
  }

  private emptyPage(page?: number, limit?: number): PaginatedSaasAuditTrailResponseDto {
    return { data: [], total: 0, page: page ?? 1, limit: limit ?? 20, totalPages: 0 };
  }

  private toCsv(rows: IAuditLogEntry[]): string {
    const columns: Array<keyof IAuditLogEntry> = [
      'id',
      'workspaceId',
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
      'requestId',
      'jobId',
      'workflowId',
      'sessionId',
      'externalRef',
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

  private async publishEvent(
    event: SaasAuditEvent,
    workspaceId?: string | null,
    incidentId?: string,
    actorId?: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, incidentId, actorId, metadata });
  }

  private async publishArchiveEvent(
    event: SaasAuditEvent,
    workspaceId: string | null,
    archiveId: string,
    actorId: string,
    metadata?: Record<string, unknown>,
  ): Promise<void> {
    await this.eventQueue.publish({ event, workspaceId, archiveId, actorId, metadata });
  }
}
