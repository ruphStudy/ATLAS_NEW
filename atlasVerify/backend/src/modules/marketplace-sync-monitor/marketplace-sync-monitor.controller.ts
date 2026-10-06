import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { MarketplaceSyncMonitorService } from './marketplace-sync-monitor.service';
import {
  GetSyncSnapshotQueryDto,
  ListSyncsQueryDto,
  GetSyncHistoryQueryDto,
  GetItemFailuresQueryDto,
  GetIssuesQueryDto,
  RetrySyncRequestDto,
  CancelSyncRequestDto,
  SyncSnapshotResponseDto,
  SyncAggregateResponseDto,
  SyncHistoryResponseDto,
  ItemFailureResponseDto,
  IssueResponseDto,
  SyncMetricsResponseDto,
  ErrorSummaryResponseDto,
  SyncActionResponseDto,
} from './dto';

@Controller('marketplace/sync-monitor')
export class MarketplaceSyncMonitorController {
  constructor(
    private readonly syncMonitorService: MarketplaceSyncMonitorService,
  ) {}

  @Get('snapshot')
  async getSyncSnapshot(
    @Query() query: GetSyncSnapshotQueryDto,
  ): Promise<SyncAggregateResponseDto> {
    return this.syncMonitorService.getSyncSnapshot(
      query.workspaceId,
      query.module,
      query.provider,
      query.accountId,
    );
  }

  @Get('syncs/all/:workspaceId')
  async listAllSyncs(
    @Param('workspaceId') workspaceId: string,
  ): Promise<SyncAggregateResponseDto[]> {
    return this.syncMonitorService.listAllSyncs(workspaceId);
  }

  @Get('syncs')
  async listSyncs(@Query() query: ListSyncsQueryDto): Promise<any[]> {
    return this.syncMonitorService.listSyncsByFilter(query.workspaceId, {
      module: query.module,
      provider: query.provider,
      accountId: query.accountId,
      status: query.status,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get('history')
  async getSyncHistory(
    @Query() query: GetSyncHistoryQueryDto,
  ): Promise<SyncHistoryResponseDto[]> {
    return this.syncMonitorService.getSyncHistory(
      query.workspaceId,
      query.module,
      query.provider,
      query.accountId,
      query.limit,
    );
  }

  @Get('failures')
  async getItemFailures(
    @Query() query: GetItemFailuresQueryDto,
  ): Promise<ItemFailureResponseDto[]> {
    return this.syncMonitorService.getItemFailures(
      query.workspaceId,
      query.jobId,
      query.module,
      query.unresolvedOnly,
    );
  }

  @Get('errors/:workspaceId/:jobId')
  async getErrorSummary(
    @Param('workspaceId') workspaceId: string,
    @Param('jobId') jobId: string,
  ): Promise<ErrorSummaryResponseDto[]> {
    return this.syncMonitorService.getErrorSummary(workspaceId, jobId);
  }

  @Get('issues')
  async getActiveIssues(
    @Query() query: GetIssuesQueryDto,
  ): Promise<IssueResponseDto[]> {
    return this.syncMonitorService.getActiveIssues(
      query.workspaceId,
      query.module,
      query.type,
    );
  }

  @Post('issues/detect')
  async detectIssues(
    @Body() body: { workspaceId: string; module?: string },
  ): Promise<IssueResponseDto[]> {
    return this.syncMonitorService.detectIssues(
      body.workspaceId,
      body.module as any,
    );
  }

  @Post('issues/resolve/:workspaceId/:issueId')
  async resolveIssue(
    @Param('workspaceId') workspaceId: string,
    @Param('issueId') issueId: string,
  ): Promise<SyncActionResponseDto> {
    await this.syncMonitorService.resolveIssue(workspaceId, issueId);
    return {
      success: true,
      message: 'Issue resolved successfully',
      metadata: { issueId },
    };
  }

  @Post('retry')
  async retrySync(
    @Body() body: RetrySyncRequestDto,
  ): Promise<SyncActionResponseDto> {
    const result = await this.syncMonitorService.retrySyncnc({
      workspaceId: body.workspaceId,
      module: body.module,
      provider: body.provider,
      accountId: body.accountId,
      jobId: body.jobId,
      resumeFromCursor: body.resumeFromCursor,
      resetErrors: body.resetErrors,
    });

    return {
      success: true,
      message: 'Sync retry initiated successfully',
      jobId: result.jobId,
    };
  }

  @Post('cancel')
  async cancelSync(
    @Body() body: CancelSyncRequestDto,
  ): Promise<SyncActionResponseDto> {
    await this.syncMonitorService.cancelSync({
      workspaceId: body.workspaceId,
      module: body.module,
      provider: body.provider,
      accountId: body.accountId,
      jobId: body.jobId,
      reason: body.reason,
      graceful: body.graceful,
    });

    return {
      success: true,
      message: 'Sync cancelled successfully',
      jobId: body.jobId,
    };
  }

  @Get('metrics/:workspaceId')
  async getMetrics(
    @Param('workspaceId') workspaceId: string,
    @Query('module') module?: string,
  ): Promise<SyncMetricsResponseDto> {
    return this.syncMonitorService.getMetrics(workspaceId, module as any);
  }

  @Get('queue-health/:workspaceId/:module')
  async getQueueHealth(
    @Param('workspaceId') workspaceId: string,
    @Param('module') module: string,
  ): Promise<any> {
    return this.syncMonitorService.getQueueHealth(workspaceId, module as any);
  }
}
