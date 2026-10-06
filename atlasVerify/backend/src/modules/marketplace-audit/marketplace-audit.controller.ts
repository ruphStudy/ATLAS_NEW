import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { MarketplaceAuditService } from './marketplace-audit.service';
import {
  RecordActivityRequestDto,
  SearchActivitiesQueryDto,
  GetEntityHistoryQueryDto,
  GetTimelineQueryDto,
  GetStatisticsQueryDto,
  CreateRetentionPolicyRequestDto,
  ActivityRecordResponseDto,
  EntityHistoryResponseDto,
  ActivityTimelineResponseDto,
  AuditStatisticsResponseDto,
  SuspiciousActivityResponseDto,
  RetentionPolicyResponseDto,
} from './dto';

@Controller('marketplace/audit')
export class MarketplaceAuditController {
  constructor(private readonly auditService: MarketplaceAuditService) {}

  @Post('record')
  async recordActivity(
    @Body() dto: RecordActivityRequestDto,
  ): Promise<ActivityRecordResponseDto> {
    return this.auditService.recordActivity({
      workspaceId: dto.workspaceId,
      provider: dto.provider,
      accountId: dto.accountId,
      module: dto.module,
      action: dto.action,
      status: dto.status,
      entityType: dto.entityType,
      entityId: dto.entityId,
      entityName: dto.entityName,
      actor: dto.actor,
      changeReference: dto.changeReference,
      metadata: dto.metadata,
      correlationId: dto.correlationId,
      requestId: dto.requestId,
      jobId: dto.jobId,
      externalId: dto.externalId,
      duration: dto.duration,
      errorCode: dto.errorCode,
      errorMessage: dto.errorMessage,
    });
  }

  @Get('search')
  async searchActivities(
    @Query() query: SearchActivitiesQueryDto,
  ): Promise<ActivityRecordResponseDto[]> {
    return this.auditService.searchActivities({
      workspaceId: query.workspaceId,
      provider: query.provider,
      accountId: query.accountId,
      module: query.module,
      action: query.action,
      status: query.status,
      actorType: query.actorType,
      actorId: query.actorId,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      correlationId: query.correlationId,
      requestId: query.requestId,
      limit: query.limit,
      offset: query.offset,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
    });
  }

  @Get('count')
  async countActivities(
    @Query() query: SearchActivitiesQueryDto,
  ): Promise<number> {
    return this.auditService.countActivities({
      workspaceId: query.workspaceId,
      provider: query.provider,
      accountId: query.accountId,
      module: query.module,
      action: query.action,
      status: query.status,
      entityType: query.entityType,
      entityId: query.entityId,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
    });
  }

  @Get('activity/:workspaceId/:activityId')
  async getActivity(
    @Param('workspaceId') workspaceId: string,
    @Param('activityId') activityId: string,
  ): Promise<ActivityRecordResponseDto | null> {
    return this.auditService.getActivity(activityId, workspaceId);
  }

  @Get('entity-history')
  async getEntityHistory(
    @Query() query: GetEntityHistoryQueryDto,
  ): Promise<EntityHistoryResponseDto> {
    return this.auditService.getEntityHistory(
      query.workspaceId,
      query.entityType,
      query.entityId,
      query.limit,
    );
  }

  @Get('timeline')
  async getActivityTimeline(
    @Query() query: GetTimelineQueryDto,
  ): Promise<ActivityTimelineResponseDto> {
    return this.auditService.getActivityTimeline(
      query.workspaceId,
      new Date(query.startDate),
      new Date(query.endDate),
      query.provider,
      query.accountId,
      query.limit,
    );
  }

  @Get('correlated/:workspaceId/:correlationId')
  async getCorrelatedActivities(
    @Param('workspaceId') workspaceId: string,
    @Param('correlationId') correlationId: string,
  ): Promise<ActivityRecordResponseDto[]> {
    return this.auditService.getCorrelatedActivities(
      workspaceId,
      correlationId,
    );
  }

  @Get('statistics')
  async getStatistics(
    @Query() query: GetStatisticsQueryDto,
  ): Promise<AuditStatisticsResponseDto> {
    return this.auditService.getStatistics(
      query.workspaceId,
      new Date(query.startDate),
      new Date(query.endDate),
    );
  }

  @Get('suspicious/:workspaceId')
  async getSuspiciousActivities(
    @Param('workspaceId') workspaceId: string,
    @Query('isResolved') isResolved?: string,
  ): Promise<SuspiciousActivityResponseDto[]> {
    return this.auditService.getSuspiciousActivities(
      workspaceId,
      isResolved !== undefined ? isResolved === 'true' : undefined,
    );
  }

  @Post('suspicious/resolve/:workspaceId/:suspiciousActivityId')
  async resolveSuspiciousActivity(
    @Param('workspaceId') workspaceId: string,
    @Param('suspiciousActivityId') suspiciousActivityId: string,
  ): Promise<void> {
    await this.auditService.resolveSuspiciousActivity(
      suspiciousActivityId,
      workspaceId,
    );
  }

  @Post('retention-policy')
  async createRetentionPolicy(
    @Body() dto: CreateRetentionPolicyRequestDto,
  ): Promise<RetentionPolicyResponseDto> {
    return this.auditService.createRetentionPolicy({
      workspaceId: dto.workspaceId,
      module: dto.module,
      retentionDays: dto.retentionDays,
      archiveBeforeDelete: dto.archiveBeforeDelete,
      enabled: dto.enabled,
    });
  }

  @Get('retention-policy/:workspaceId')
  async getRetentionPolicies(
    @Param('workspaceId') workspaceId: string,
  ): Promise<RetentionPolicyResponseDto[]> {
    return this.auditService.getRetentionPolicies(workspaceId);
  }

  @Post('retention-policy/apply/:workspaceId')
  async applyRetentionPolicies(
    @Param('workspaceId') workspaceId: string,
  ): Promise<void> {
    await this.auditService.applyRetentionPolicies(workspaceId);
  }
}
