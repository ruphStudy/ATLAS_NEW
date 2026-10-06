import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncMonitorRepository } from './repository/sync-monitor.repository';
import { SyncAggregator } from './aggregator/sync-aggregator';
import { SyncIssueDetector } from './detector/sync-issue-detector';
import { SyncMonitorLifecycleQueue } from './events/sync-monitor-lifecycle.queue';
import { SyncMonitorMetrics as MetricsService, ISyncMonitorMetrics } from './metrics/sync-monitor.metrics';
import {
  SyncModule,
  SyncStatus,
  SyncIssueType,
  SyncAggregateData,
  ISyncHistory,
  IItemLevelFailure,
  ISyncIssue,
  NormalizedErrorSummary,
  SyncRetryOptions,
  SyncCancellationOptions,
  SyncMonitorEvent,
  ISyncMonitorEvent,
} from './interfaces';

@Injectable()
export class MarketplaceSyncMonitorService {
  constructor(
    private readonly repository: SyncMonitorRepository,
    private readonly aggregator: SyncAggregator,
    private readonly detector: SyncIssueDetector,
    private readonly lifecycleQueue: SyncMonitorLifecycleQueue,
    private readonly metricsService: MetricsService,
    @InjectQueue('marketplace-catalog-sync-jobs')
    private readonly catalogSyncQueue: Queue,
    @InjectQueue('marketplace-inventory-sync-jobs')
    private readonly inventorySyncQueue: Queue,
    @InjectQueue('marketplace-listing-sync-jobs')
    private readonly listingSyncQueue: Queue,
    @InjectQueue('marketplace-order-sync-jobs')
    private readonly orderSyncQueue: Queue,
    @InjectQueue('marketplace-shipment-sync-jobs')
    private readonly shipmentSyncQueue: Queue,
    @InjectQueue('marketplace-return-sync-jobs')
    private readonly returnSyncQueue: Queue,
    @InjectQueue('marketplace-pricing-sync-jobs')
    private readonly pricingSyncQueue: Queue,
    @InjectQueue('marketplace-report-sync-jobs')
    private readonly reportSyncQueue: Queue,
  ) {}

  async getSyncSnapshot(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ): Promise<SyncAggregateData> {
    const aggregateData = await this.aggregator.aggregateSyncData(
      workspaceId,
      module,
      provider,
      accountId,
    );

    const { issues, alerts } = await this.detector.detectSnapshotIssues(
      aggregateData.snapshot,
      aggregateData.queueHealth,
    );

    if (issues.length > 0) {
      for (const issue of issues) {
        await this.repository.createIssue(issue);
      }
      await this.lifecycleQueue.publishBatch(alerts);
    }

    return {
      ...aggregateData,
      activeIssues: [...aggregateData.activeIssues, ...issues],
    };
  }

  async listAllSyncs(workspaceId: string): Promise<SyncAggregateData[]> {
    const aggregateData = await this.aggregator.aggregateAllSyncs(workspaceId);

    const { issues, alerts } = await this.detector.detectIssues(workspaceId);

    if (issues.length > 0) {
      for (const issue of issues) {
        await this.repository.createIssue(issue);
      }
      await this.lifecycleQueue.publishBatch(alerts);
    }

    return aggregateData;
  }

  async listSyncsByFilter(
    workspaceId: string,
    filters: {
      module?: SyncModule;
      provider?: string;
      accountId?: string;
      status?: SyncStatus;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    },
  ): Promise<any[]> {
    let jobs: any[];

    if (filters.startDate && filters.endDate) {
      jobs = await this.repository.findJobsByDateRange(
        workspaceId,
        filters.startDate,
        filters.endDate,
        filters.module,
      );
    } else if (filters.status) {
      jobs = await this.repository.findJobsByStatus(
        workspaceId,
        filters.status,
        filters.module,
      );
    } else if (filters.provider) {
      jobs = await this.repository.findJobsByProvider(
        workspaceId,
        filters.provider,
        filters.accountId,
      );
    } else {
      jobs = await this.repository.findJobsByStatus(
        workspaceId,
        Object.values(SyncStatus),
        filters.module,
      );
    }

    if (filters.offset) {
      jobs = jobs.slice(filters.offset);
    }

    if (filters.limit) {
      jobs = jobs.slice(0, filters.limit);
    }

    return jobs;
  }

  async getSyncHistory(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
    limit?: number,
  ): Promise<ISyncHistory[]> {
    const jobsRaw = await this.repository.findRecentHistory(
      workspaceId,
      module,
      provider,
      accountId,
      limit,
    );
    const jobs = jobsRaw as unknown as Array<{
      workspaceId: string;
      module: SyncModule;
      provider: string;
      accountId?: string;
      id: string;
      status: SyncStatus;
      startedAt: Date;
      completedAt?: Date;
      itemsProcessed?: number;
      itemsTotal?: number;
      itemsFailed?: number;
      lastError?: string;
      triggeredBy?: string;
    }>;

    return jobs.map((job) => ({
      workspaceId: job.workspaceId,
      module: job.module,
      provider: job.provider,
      accountId: job.accountId,
      jobId: job.id,
      status: job.status,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      duration: this.calculateDuration(job),
      itemsProcessed: job.itemsProcessed || 0,
      itemsTotal: job.itemsTotal,
      itemsFailed: job.itemsFailed || 0,
      successRate: this.calculateSuccessRate(job),
      errorSummary: job.lastError,
      triggeredBy: job.triggeredBy,
    }));
  }

  async getItemFailures(
    workspaceId: string,
    jobId?: string,
    module?: SyncModule,
    unresolvedOnly?: boolean,
  ): Promise<IItemLevelFailure[]> {
    if (jobId) {
      const failures = await this.repository.findItemFailures(workspaceId, jobId);
      return failures as unknown as IItemLevelFailure[];
    }

    if (module && unresolvedOnly) {
      const failures = await this.repository.findUnresolvedItemFailures(workspaceId, module);
      return failures as unknown as IItemLevelFailure[];
    }

    return [];
  }

  async getErrorSummary(
    workspaceId: string,
    jobId: string,
  ): Promise<NormalizedErrorSummary[]> {
    const aggregatedErrors = await this.repository.aggregateErrorsByCode(
      workspaceId,
      jobId,
    );

    return aggregatedErrors.map((error) => ({
      errorCode: error.code !== 'UNKNOWN' ? error.code : undefined,
      errorMessage: error.message,
      count: error.count,
      firstOccurrence: error.firstOccurrence,
      lastOccurrence: error.lastOccurrence,
      affectedItems: error.items,
      isRecoverable: this.isRecoverableError(error.code),
      suggestedAction: this.getSuggestedAction(error.code),
    }));
  }

  async getActiveIssues(
    workspaceId: string,
    module?: SyncModule,
    type?: SyncIssueType,
  ): Promise<ISyncIssue[]> {
    const issuesRaw = await this.repository.findActiveIssues(workspaceId, module);
    const issues = issuesRaw as unknown as ISyncIssue[];

    if (type) {
      return issues.filter((issue) => issue.type === type);
    }

    return issues;
  }

  async detectIssues(
    workspaceId: string,
    module?: SyncModule,
  ): Promise<ISyncIssue[]> {
    const { issues, alerts } = await this.detector.detectIssues(
      workspaceId,
      module,
    );

    if (issues.length > 0) {
      for (const issue of issues) {
        await this.repository.createIssue(issue);
      }
      await this.lifecycleQueue.publishBatch(alerts);
    }

    return issues;
  }

  async resolveIssue(workspaceId: string, issueId: string): Promise<void> {
    await this.repository.resolveIssue(workspaceId, issueId);

    await this.lifecycleQueue.publish({
      eventType: SyncMonitorEvent.ISSUE_RESOLVED,
      workspaceId,
      module: SyncModule.CATALOG,
      provider: '',
      metadata: { issueId },
      timestamp: new Date(),
    });
  }

  async retrySyncnc(options: SyncRetryOptions): Promise<{ jobId: string }> {
    const queue = this.getQueueForModule(options.module);
    if (!queue) {
      throw new Error(`No queue found for module: ${options.module}`);
    }

    const jobData: any = {
      workspaceId: options.workspaceId,
      provider: options.provider,
      accountId: options.accountId,
      type: 'MANUAL',
      triggeredBy: 'monitor',
    };

    if (options.resumeFromCursor && options.jobId) {
      const existingJob = await this.repository.findJob(
        options.workspaceId,
        options.jobId,
      );
      if (existingJob?.nextCursor) {
        jobData.cursor = existingJob.nextCursor;
      }
    }

    const job = await queue.add('sync-job', jobData, {
      priority: 1,
    });

    await this.lifecycleQueue.publish({
      eventType: SyncMonitorEvent.SYNC_RETRIED,
      workspaceId: options.workspaceId,
      module: options.module,
      provider: options.provider,
      accountId: options.accountId,
      jobId: job.id,
      timestamp: new Date(),
    });

    return { jobId: job.id as string };
  }

  async cancelSync(options: SyncCancellationOptions): Promise<void> {
    const queue = this.getQueueForModule(options.module);
    if (!queue) {
      throw new Error(`No queue found for module: ${options.module}`);
    }

    const job = await queue.getJob(options.jobId);
    if (!job) {
      throw new Error(`Job not found: ${options.jobId}`);
    }

    if (options.graceful) {
      await job.updateData({ ...job.data, cancelled: true });
    } else {
      await job.remove();
    }

    await this.repository.updateJob(
      options.jobId,
      options.workspaceId,
      { status: SyncStatus.CANCELLED },
    );

    await this.lifecycleQueue.publish({
      eventType: SyncMonitorEvent.SYNC_CANCELLED,
      workspaceId: options.workspaceId,
      module: options.module,
      provider: options.provider,
      accountId: options.accountId,
      jobId: options.jobId,
      metadata: { reason: options.reason, graceful: options.graceful },
      timestamp: new Date(),
    });
  }

  async getMetrics(
    workspaceId: string,
    module?: SyncModule,
  ): Promise<ISyncMonitorMetrics> {
    return this.metricsService.getMetrics(workspaceId, module);
  }

  async getQueueHealth(workspaceId: string, module: SyncModule): Promise<any> {
    const queue = this.getQueueForModule(module);
    if (!queue) return null;

    const [counts, isPaused] = await Promise.all([
      queue.getJobCounts(),
      queue.isPaused(),
    ]);

    return {
      queueName: queue.name,
      workspaceId,
      module,
      ...counts,
      isPaused,
      isHealthy: !isPaused && counts.waiting < 500 && counts.failed < counts.completed,
    };
  }

  private getQueueForModule(module: SyncModule): Queue | undefined {
    switch (module) {
      case SyncModule.CATALOG:
        return this.catalogSyncQueue;
      case SyncModule.INVENTORY:
        return this.inventorySyncQueue;
      case SyncModule.LISTING:
        return this.listingSyncQueue;
      case SyncModule.ORDER:
        return this.orderSyncQueue;
      case SyncModule.SHIPMENT:
        return this.shipmentSyncQueue;
      case SyncModule.RETURN:
        return this.returnSyncQueue;
      case SyncModule.PRICING:
        return this.pricingSyncQueue;
      case SyncModule.REPORT:
        return this.reportSyncQueue;
      default:
        return undefined;
    }
  }

  private calculateDuration(job: any): number | undefined {
    if (!job?.startedAt) return undefined;
    const endTime = job.completedAt || new Date();
    return endTime.getTime() - job.startedAt.getTime();
  }

  private calculateSuccessRate(job: any): number {
    if (!job || job.itemsProcessed === 0) return 0;
    const successCount = job.itemsProcessed - (job.itemsFailed || 0);
    return (successCount / job.itemsProcessed) * 100;
  }

  private isRecoverableError(errorCode: string): boolean {
    const recoverableCodes = [
      'RATE_LIMITED',
      'TIMEOUT',
      'NETWORK_ERROR',
      'SERVICE_UNAVAILABLE',
    ];
    return recoverableCodes.includes(errorCode);
  }

  private getSuggestedAction(errorCode: string): string | undefined {
    const actions: Record<string, string> = {
      RATE_LIMITED: 'Wait for rate limit to reset and retry',
      TIMEOUT: 'Retry with smaller batch size',
      NETWORK_ERROR: 'Check network connectivity and retry',
      SERVICE_UNAVAILABLE: 'Wait for service to recover and retry',
      AUTHENTICATION_ERROR: 'Refresh credentials and retry',
      INVALID_DATA: 'Review and correct item data',
    };
    return actions[errorCode];
  }
}
