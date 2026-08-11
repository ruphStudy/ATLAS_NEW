import { Injectable, Logger } from '@nestjs/common';
import { AuditLogsRepository } from './audit-logs.repository';
import { AuditRiskAnalyzer } from './audit-risk-analyzer';
import { AuditLogEventQueue } from './jobs';
import {
  RecordAuditLogDto,
  AuditLogFilterDto,
  ExportAuditLogDto,
  PaginatedAuditLogEntryResponseDto,
  AuditExportResponseDto,
} from './dto';
import { IAuditLogEntry, AuditEvent, ActivityOutcome } from './interfaces';
import {
  AuditLogEntryNotFoundException,
  AuditLogAccessDeniedException,
  AuditLogExportDeniedException,
} from './exceptions/audit-log.exceptions';
import {
  AUDIT_LOG_VIEW_ROLES,
  AUDIT_LOG_EXPORT_ROLES,
  DEFAULT_AUDIT_RETENTION_DAYS,
} from './constants';

/**
 * AuditLogsService — the central, immutable audit log for ATLAS.
 *
 * Records are append-only: this service exposes no update/edit path at all
 * (only `record`, reads, export, and retention-driven deletion of
 * already-past-retention, non-flagged rows). It does not replace or
 * duplicate each module's own domain-specific audit/history tables (e.g.
 * `AiResponseValidationHistory`, `NotificationProviderConfigHistory`) — those
 * remain authoritative for full domain-specific before/after payloads.
 * This is the cross-cutting, security/compliance-oriented ledger that any
 * module can additionally write a lightweight entry to via `record()`.
 */
@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(
    private readonly repository: AuditLogsRepository,
    private readonly riskAnalyzer: AuditRiskAnalyzer,
    private readonly eventQueue: AuditLogEventQueue,
  ) {}

  // ── Recording ────────────────────────────────────────────────────

  async record(dto: RecordAuditLogDto): Promise<IAuditLogEntry> {
    if (dto.dedupeKey) {
      const existing = await this.repository.findExistingByDedupeKey(dto.workspaceId, dto.dedupeKey);
      if (existing) {
        return existing;
      }
    }

    const assessment = await this.riskAnalyzer.assess(dto);

    const entry = await this.repository.create({
      workspaceId: dto.workspaceId,
      actorType: dto.actorType,
      actorId: dto.actorId,
      actorName: dto.actorName,
      actorRole: dto.actorRole,
      action: dto.action,
      actionCategory: dto.actionCategory,
      module: dto.module,
      entityType: dto.entityType,
      entityId: dto.entityId,
      outcome: dto.outcome ?? ActivityOutcome.SUCCESS,
      reason: dto.reason,
      beforeState: dto.beforeState ?? null,
      afterState: dto.afterState ?? null,
      changedFields: dto.changedFields ?? [],
      correlationId: dto.correlationId,
      requestId: dto.requestId,
      jobId: dto.jobId,
      workflowId: dto.workflowId,
      sessionId: dto.sessionId,
      externalRef: dto.externalRef,
      riskLevel: assessment.riskLevel,
      flagged: assessment.flagged,
      flagReason: assessment.flagReason,
      dedupeKey: dto.dedupeKey,
      metadata: dto.metadata ?? {},
    });

    await this.eventQueue.publish({
      event: AuditEvent.AUDIT_RECORDED,
      workspaceId: dto.workspaceId,
      auditLogId: entry.id,
      actorId: dto.actorId,
      riskLevel: entry.riskLevel,
    });

    if (assessment.flagged) {
      await this.eventQueue.publish({
        event: AuditEvent.SUSPICIOUS_ACTIVITY_DETECTED,
        workspaceId: dto.workspaceId,
        auditLogId: entry.id,
        actorId: dto.actorId,
        riskLevel: entry.riskLevel,
        metadata: { flagReason: entry.flagReason },
      });

      this.logger.warn(
        `Suspicious activity flagged for workspace ${dto.workspaceId}: ${entry.flagReason ?? entry.riskLevel}`,
      );
    }

    return entry;
  }

  // ── Reads (permission-gated) ─────────────────────────────────────

  async findById(id: string, workspaceId: string, userRole: string): Promise<IAuditLogEntry> {
    this.assertCanView(userRole);

    const entry = await this.repository.findById(id, workspaceId);
    if (!entry) {
      throw new AuditLogEntryNotFoundException(id);
    }
    return entry;
  }

  async findAll(
    workspaceId: string,
    userRole: string,
    filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    this.assertCanView(userRole);

    const [data, total] = await this.repository.findAll(workspaceId, filter);
    return this.paginate(data, total, filter);
  }

  async findEntityHistory(
    workspaceId: string,
    userRole: string,
    entityType: string,
    entityId: string,
    filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    this.assertCanView(userRole);

    const [data, total] = await this.repository.findEntityHistory(workspaceId, entityType, entityId, filter);
    return this.paginate(data, total, filter);
  }

  async findActorHistory(
    workspaceId: string,
    userRole: string,
    actorId: string,
    filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogEntryResponseDto> {
    this.assertCanView(userRole);

    const [data, total] = await this.repository.findActorHistory(workspaceId, actorId, filter);
    return this.paginate(data, total, filter);
  }

  // ── Export ───────────────────────────────────────────────────────

  async exportLogs(
    workspaceId: string,
    userRole: string,
    dto: ExportAuditLogDto,
  ): Promise<AuditExportResponseDto> {
    this.assertCanExport(userRole);

    const rows = await this.repository.findAllForExport(workspaceId, dto);
    const format = dto.format ?? 'JSON';

    const content = format === 'CSV' ? this.toCsv(rows) : JSON.stringify(rows, null, 2);

    return { format, count: rows.length, content };
  }

  // ── Retention ────────────────────────────────────────────────────

  async purgeRetention(workspaceId: string, retentionDays?: number): Promise<number> {
    const days = retentionDays ?? DEFAULT_AUDIT_RETENTION_DAYS;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const purged = await this.repository.purgeOlderThan(workspaceId, cutoff);
    this.logger.debug(`Purged ${purged} non-flagged audit entries for workspace ${workspaceId}`);
    return purged;
  }

  // ── Helpers ──────────────────────────────────────────────────────

  private assertCanView(userRole: string): void {
    if (!AUDIT_LOG_VIEW_ROLES.includes(userRole)) {
      throw new AuditLogAccessDeniedException();
    }
  }

  private assertCanExport(userRole: string): void {
    if (!AUDIT_LOG_EXPORT_ROLES.includes(userRole)) {
      throw new AuditLogExportDeniedException();
    }
  }

  private paginate(
    data: IAuditLogEntry[],
    total: number,
    filter: AuditLogFilterDto,
  ): PaginatedAuditLogEntryResponseDto {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;

    return {
      data: data as any,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
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
}
