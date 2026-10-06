import { Injectable, Logger } from '@nestjs/common';
import { AiAuditActivityRepository } from './ai-audit-activity.repository';
import { AiAuditEventQueue } from './jobs';
import {
  RecordAuditDto,
  AuditLogFilterDto,
  AuditLogResponseDto,
  PaginatedAuditLogResponseDto,
  AuditSummaryResponseDto,
} from './dto';
import {
  IAiAuditLog,
  AiAuditEventType,
  AiAuditOutcome,
} from './interfaces';
import { ResourceNotFoundException } from '@common/exceptions/resource-not-found.exception';
import { ErrorCode } from '@common/exceptions/error-codes.enum';

@Injectable()
export class AiAuditActivityService {
  private readonly logger = new Logger(AiAuditActivityService.name);
  private readonly RETENTION_DAYS = 90;

  constructor(
    private readonly repository: AiAuditActivityRepository,
    private readonly eventQueue: AiAuditEventQueue,
  ) {}

  async recordActivity(dto: RecordAuditDto): Promise<AuditLogResponseDto> {
    const suspicious = this.detectSuspiciousActivity(dto);
    const suspicionReasons = suspicious ? this.getSuspicionReasons(dto) : [];

    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() + this.RETENTION_DAYS);

    const auditLog = await this.repository.createAuditLog({
      workspaceId: dto.workspaceId,
      actorType: dto.actorType,
      actorId: dto.actorId,
      actorName: dto.actorName,
      action: dto.action,
      outcome: dto.outcome,
      capability: dto.capability,
      useCase: dto.useCase,
      provider: dto.provider,
      model: dto.model,
      agentId: dto.agentId,
      agentExecutionId: dto.agentExecutionId,
      workflowId: dto.workflowId,
      workflowExecutionId: dto.workflowExecutionId,
      jobId: dto.jobId,
      jobExecutionId: dto.jobExecutionId,
      queueJobId: dto.queueJobId,
      orchestratorRequestId: dto.orchestratorRequestId,
      correlationId: dto.correlationId,
      externalReferenceId: dto.externalReferenceId,
      inputTokens: dto.inputTokens,
      outputTokens: dto.outputTokens,
      totalTokens: dto.totalTokens,
      cost: dto.cost,
      latencyMs: dto.latencyMs,
      validationResult: dto.validationResult,
      guardrailDecision: dto.guardrailDecision,
      guardrailReasons: dto.guardrailReasons || [],
      inputReference: dto.inputReference,
      outputReference: dto.outputReference,
      errorCode: dto.errorCode,
      errorMessage: dto.errorMessage,
      suspicious,
      suspicionReasons,
      ipAddress: dto.ipAddress,
      userAgent: dto.userAgent,
      tags: dto.tags || [],
      metadata: dto.metadata || {},
      retentionDate,
    });

    await this.eventQueue.publish({
      event: AiAuditEventType.ACTIVITY_RECORDED,
      workspaceId: dto.workspaceId,
      auditLogId: auditLog.id,
      action: dto.action,
      outcome: dto.outcome,
    });

    if (suspicious) {
      await this.eventQueue.publish({
        event: AiAuditEventType.SUSPICIOUS_ACTIVITY,
        workspaceId: dto.workspaceId,
        auditLogId: auditLog.id,
        reasons: suspicionReasons,
        actorId: dto.actorId,
      });
    }

    return auditLog as AuditLogResponseDto;
  }

  async findAuditLogById(
    id: string,
    workspaceId: string,
  ): Promise<AuditLogResponseDto> {
    const auditLog = await this.repository.findAuditLogById(id, workspaceId);
    if (!auditLog) {
      throw new ResourceNotFoundException(
        'Audit log not found',
        ErrorCode.RESOURCE_NOT_FOUND,
      );
    }
    return auditLog as AuditLogResponseDto;
  }

  async findAllAuditLogs(
    filter: AuditLogFilterDto,
  ): Promise<PaginatedAuditLogResponseDto> {
    const [data, total] = await this.repository.findAllAuditLogs(filter);

    const page = filter.page ?? 1;
    const limit = filter.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    return {
      data: data as AuditLogResponseDto[],
      total,
      page,
      limit,
      totalPages,
    };
  }

  async getActivityTimeline(
    workspaceId: string,
    entityType: string,
    entityId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLogResponseDto[]> {
    const activities = await this.repository.findActivityTimeline(
      workspaceId,
      entityType,
      entityId,
      startDate,
      endDate,
    );
    return activities as AuditLogResponseDto[];
  }

  async getSuspiciousActivities(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<AuditLogResponseDto[]> {
    const activities = await this.repository.findSuspiciousActivities(
      workspaceId,
      startDate,
      endDate,
    );
    return activities as AuditLogResponseDto[];
  }

  async getWorkspaceStats(
    workspaceId: string,
    startDate?: Date,
    endDate?: Date,
  ): Promise<any> {
    return this.repository.getWorkspaceStats(workspaceId, startDate, endDate);
  }

  async archiveOldLogs(
    workspaceId: string,
    beforeDate: Date,
  ): Promise<number> {
    return this.repository.archiveOldLogs(workspaceId, beforeDate);
  }

  private detectSuspiciousActivity(dto: RecordAuditDto): boolean {
    if (dto.outcome === AiAuditOutcome.BLOCKED) {
      return true;
    }

    if (dto.guardrailDecision === 'BLOCK') {
      return true;
    }

    if (dto.cost && dto.cost > 10) {
      return true;
    }

    if (dto.totalTokens && dto.totalTokens > 100000) {
      return true;
    }

    return false;
  }

  private getSuspicionReasons(dto: RecordAuditDto): string[] {
    const reasons: string[] = [];

    if (dto.outcome === AiAuditOutcome.BLOCKED) {
      reasons.push('Request was blocked');
    }

    if (dto.guardrailDecision === 'BLOCK') {
      reasons.push('Guardrail blocked the request');
    }

    if (dto.cost && dto.cost > 10) {
      reasons.push('Unusually high cost');
    }

    if (dto.totalTokens && dto.totalTokens > 100000) {
      reasons.push('Unusually high token usage');
    }

    return reasons;
  }
}
