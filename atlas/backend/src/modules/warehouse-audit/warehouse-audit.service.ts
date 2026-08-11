import { Injectable, Logger } from '@nestjs/common';
import { WarehouseAuditRepository } from './warehouse-audit.repository';
import { WarehouseAuditEventQueue } from './jobs';
import {
  RecordAuditLogDto,
  WarehouseAuditLogFilterDto,
  WarehouseAuditLogResponseDto,
  PaginatedWarehouseAuditLogResponseDto,
  AuditActivityTimelineDto,
  AuditStatisticsDto,
} from './dto';
import {
  IWarehouseAuditLog,
  WarehouseAuditOutcome,
  WarehouseAuditEvent,
  WarehouseAuditEntityType,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class WarehouseAuditService {
  private readonly logger = new Logger(WarehouseAuditService.name);

  constructor(
    private readonly repository: WarehouseAuditRepository,
    private readonly eventQueue: WarehouseAuditEventQueue,
  ) {}

  async recordAuditLog(dto: RecordAuditLogDto): Promise<IWarehouseAuditLog> {
    const data = {
      workspaceId: dto.workspaceId,
      warehouseId: dto.warehouseId,
      actorType: dto.actorType,
      actorId: dto.actorId,
      actorName: dto.actorName,
      actionType: dto.actionType,
      actionDescription: dto.actionDescription,
      entityType: dto.entityType,
      entityId: dto.entityId,
      entityReference: dto.entityReference,
      outcome: dto.outcome ?? WarehouseAuditOutcome.SUCCESS,
      beforeState: dto.beforeState,
      afterState: dto.afterState,
      changes: dto.changes,
      metadata: dto.metadata ?? {},
      reason: dto.reason,
      errorMessage: dto.errorMessage,
      correlationId: dto.correlationId,
      requestId: dto.requestId,
      jobId: dto.jobId,
      barcodeId: dto.barcodeId,
      externalReference: dto.externalReference,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      module: dto.module,
      operation: dto.operation,
      suspicious: dto.suspicious ?? false,
      suspiciousReason: dto.suspiciousReason,
      timestamp: new Date(),
    };

    const auditLog = (await this.repository.recordAuditLog(
      data,
    )) as IWarehouseAuditLog;

    await this.eventQueue.publish({
      event: WarehouseAuditEvent.AUDIT_RECORDED,
      workspaceId: auditLog.workspaceId,
      warehouseId: auditLog.warehouseId,
      auditLogId: auditLog.id,
      actorType: auditLog.actorType,
      actionType: auditLog.actionType,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
    });

    if (auditLog.suspicious) {
      await this.eventQueue.publish({
        event: WarehouseAuditEvent.SUSPICIOUS_ACTIVITY,
        workspaceId: auditLog.workspaceId,
        warehouseId: auditLog.warehouseId,
        auditLogId: auditLog.id,
        actorType: auditLog.actorType,
        actionType: auditLog.actionType,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        suspicious: true,
        suspiciousReason: auditLog.suspiciousReason,
      });
    }

    return auditLog;
  }

  async findAuditLogById(
    id: string,
    workspaceId: string,
  ): Promise<IWarehouseAuditLog> {
    const auditLog = await this.repository.findAuditLogById(id, workspaceId);
    if (!auditLog) {
      throw new ResourceNotFoundException(
        'Audit log not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return auditLog as IWarehouseAuditLog;
  }

  async findAllAuditLogs(
    workspaceId: string,
    filter: WarehouseAuditLogFilterDto,
  ): Promise<PaginatedWarehouseAuditLogResponseDto> {
    const [data, total] = await this.repository.findAllAuditLogs(
      workspaceId,
      filter,
    );

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 50;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as WarehouseAuditLogResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getEntityHistory(
    workspaceId: string,
    entityType: WarehouseAuditEntityType,
    entityId: string,
    limit?: number,
  ): Promise<AuditActivityTimelineDto> {
    const activities = await this.repository.findEntityHistory(
      workspaceId,
      entityType,
      entityId,
      limit,
    );

    return {
      entityType,
      entityId,
      activities: activities as WarehouseAuditLogResponseDto[],
      total: activities.length,
    };
  }

  async getSuspiciousActivities(
    workspaceId: string,
    warehouseId?: string,
    limit?: number,
  ): Promise<WarehouseAuditLogResponseDto[]> {
    const activities = await this.repository.findSuspiciousActivities(
      workspaceId,
      warehouseId,
      limit,
    );

    return activities as WarehouseAuditLogResponseDto[];
  }

  async getAuditStatistics(
    workspaceId: string,
    warehouseId?: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AuditStatisticsDto> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    const stats = await this.repository.getAuditStatistics(
      workspaceId,
      warehouseId,
      start,
      end,
    );

    return {
      totalAudits: stats.totalAudits,
      byAction: stats.byAction,
      byOutcome: stats.byOutcome,
      byActor: stats.byActor,
      suspiciousCount: stats.suspiciousCount,
    };
  }
}
