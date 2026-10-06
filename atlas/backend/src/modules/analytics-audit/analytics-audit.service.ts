import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsAuditRepository } from './analytics-audit.repository';
import { AnalyticsAuditEventQueue } from './jobs';
import {
  RecordAuditDto,
  BulkRecordAuditDto,
  AuditFilterDto,
  EntityTimelineDto,
  ArchiveOldRecordsDto,
  AnalyticsAuditRecordResponseDto,
  AuditTimelineResponseDto,
  SuspiciousActivityResponseDto,
  PaginatedAuditRecordResponseDto,
  AuditStatisticsDto,
} from './dto';
import {
  IAnalyticsAuditRecord,
  AnalyticsAuditEventType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions';
import { BusinessRuleException } from '@common/exceptions';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AnalyticsAuditService {
  private readonly logger = new Logger(AnalyticsAuditService.name);
  private readonly SUSPICIOUS_ACTIVITY_THRESHOLD = 100;
  private readonly SUSPICIOUS_ACTIVITY_WINDOW_MINUTES = 5;
  private readonly DUPLICATE_DETECTION_WINDOW_SECONDS = 10;

  constructor(
    private readonly repository: AnalyticsAuditRepository,
    private readonly eventQueue: AnalyticsAuditEventQueue,
  ) {}

  async recordAudit(dto: RecordAuditDto): Promise<AnalyticsAuditRecordResponseDto> {
    const duplicate = await this.repository.detectDuplicate(
      dto.workspaceId,
      dto.module,
      dto.action,
      dto.entityId || '',
      new Date(),
    );

    if (duplicate) {
      this.logger.debug(
        `Duplicate audit record detected for ${dto.module}/${dto.action}/${dto.entityId}`,
      );
      return duplicate as AnalyticsAuditRecordResponseDto;
    }

    const record = await this.repository.createAuditRecord({
      workspaceId: dto.workspaceId,
      module: dto.module,
      action: dto.action,
      actor: dto.actor,
      actorId: dto.actorId,
      entityType: dto.entityType,
      entityId: dto.entityId,
      timestamp: new Date(),
      outcome: dto.outcome,
      duration: dto.duration,
      correlationId: dto.correlationId,
      parentAuditId: dto.parentAuditId,
      metadata: dto.metadata,
      inputOutput: dto.inputOutput,
      status: dto.status,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
    });

    await this.eventQueue.publish({
      event: AnalyticsAuditEventType.AUDIT_RECORDED,
      workspaceId: record.workspaceId,
      auditRecordId: record.id,
      module: record.module,
      action: record.action,
      outcome: record.outcome,
      timestamp: new Date(),
    });

    if (dto.actorId) {
      await this.checkSuspiciousActivity(dto.workspaceId, dto.actorId);
    }

    return record as AnalyticsAuditRecordResponseDto;
  }

  async bulkRecordAudit(dto: BulkRecordAuditDto): Promise<AnalyticsAuditRecordResponseDto[]> {
    const records: AnalyticsAuditRecordResponseDto[] = [];

    for (const recordDto of dto.records) {
      const record = await this.recordAudit(recordDto);
      records.push(record);
    }

    return records;
  }

  async getAuditRecordById(id: string, workspaceId: string): Promise<AnalyticsAuditRecordResponseDto> {
    const record = await this.repository.findAuditRecordById(id, workspaceId);
    if (!record) {
      throw new ResourceNotFoundException(`Audit record ${id} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    }

    return record as AnalyticsAuditRecordResponseDto;
  }

  async getAllAuditRecords(filter: AuditFilterDto): Promise<PaginatedAuditRecordResponseDto> {
    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;

    const { records, total } = await this.repository.findAllAuditRecords({
      ...filter,
      page,
      limit,
    });

    return {
      data: records as AnalyticsAuditRecordResponseDto[],
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getByCorrelationId(
    correlationId: string,
    workspaceId: string,
  ): Promise<AnalyticsAuditRecordResponseDto[]> {
    const records = await this.repository.findByCorrelationId(correlationId, workspaceId);
    return records as AnalyticsAuditRecordResponseDto[];
  }

  async getEntityTimeline(dto: EntityTimelineDto): Promise<AuditTimelineResponseDto> {
    const timeline = await this.repository.findEntityTimeline(dto);
    return timeline as AuditTimelineResponseDto;
  }

  async getEntityHistory(
    workspaceId: string,
    entityType: string,
    entityId: string,
  ): Promise<AnalyticsAuditRecordResponseDto[]> {
    const records = await this.repository.findByEntity(workspaceId, entityType, entityId);
    return records as AnalyticsAuditRecordResponseDto[];
  }

  async archiveOldRecords(dto: ArchiveOldRecordsDto): Promise<{ archived: number }> {
    if (dto.dryRun) {
      return { archived: 0 };
    }

    const archived = await this.repository.archiveOldRecords(dto.workspaceId, dto.beforeDate);

    this.logger.log(`Archived ${archived} audit records for workspace ${dto.workspaceId}`);

    return { archived };
  }

  async deleteArchivedRecords(
    workspaceId: string,
    beforeDate: Date,
  ): Promise<{ deleted: number }> {
    const deleted = await this.repository.deleteArchivedRecords(workspaceId, beforeDate);

    this.logger.log(`Deleted ${deleted} archived audit records for workspace ${workspaceId}`);

    return { deleted };
  }

  async getSuspiciousActivities(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<SuspiciousActivityResponseDto[]> {
    const activities = await this.repository.findSuspiciousActivities(
      workspaceId,
      startDate,
      endDate,
    );
    return activities as SuspiciousActivityResponseDto[];
  }

  async getStatistics(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditStatisticsDto> {
    const stats = await this.repository.getStatistics(workspaceId, startDate, endDate);
    return {
      workspaceId,
      totalRecords: stats.totalRecords,
      recordsByModule: stats.recordsByModule,
      recordsByAction: stats.recordsByAction,
      recordsByOutcome: stats.recordsByOutcome,
      averageDuration: stats.averageDuration,
      suspiciousActivityCount: stats.suspiciousActivityCount,
    };
  }

  private async checkSuspiciousActivity(workspaceId: string, actorId: string): Promise<void> {
    const recentCount = await this.repository.countRecordsByActor(
      workspaceId,
      actorId,
      this.SUSPICIOUS_ACTIVITY_WINDOW_MINUTES,
    );

    if (recentCount > this.SUSPICIOUS_ACTIVITY_THRESHOLD) {
      const recentRecords = await this.repository.findRecentFailures(
        workspaceId,
        actorId,
        this.SUSPICIOUS_ACTIVITY_WINDOW_MINUTES,
      );

      const failureRate = recentRecords.length / recentCount;
      const severity = this.determineSeverity(recentCount, failureRate);

      const suspiciousActivity = await this.repository.createSuspiciousActivity({
        workspaceId,
        actorId,
        pattern: 'high_volume_activity',
        severity,
        auditRecordIds: recentRecords.map((r) => r.id),
        description: `Actor ${actorId} performed ${recentCount} actions in ${this.SUSPICIOUS_ACTIVITY_WINDOW_MINUTES} minutes`,
        metadata: {
          recentCount,
          failureRate,
          windowMinutes: this.SUSPICIOUS_ACTIVITY_WINDOW_MINUTES,
        },
      });

      await this.eventQueue.publish({
        event: AnalyticsAuditEventType.SUSPICIOUS_ACTIVITY,
        workspaceId,
        timestamp: new Date(),
        metadata: {
          suspiciousActivityId: suspiciousActivity.id,
          actorId,
          severity,
          pattern: 'high_volume_activity',
        },
      });

      this.logger.warn(
        `Suspicious activity detected for actor ${actorId} in workspace ${workspaceId}`,
        {
          recentCount,
          failureRate,
          severity,
        },
      );
    }
  }

  private determineSeverity(
    recentCount: number,
    failureRate: number,
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (recentCount > 500 || failureRate > 0.5) return 'critical';
    if (recentCount > 300 || failureRate > 0.3) return 'high';
    if (recentCount > 150 || failureRate > 0.15) return 'medium';
    return 'low';
  }
}
