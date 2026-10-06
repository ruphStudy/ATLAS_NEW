import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SyncMonitorRepository } from '../repository/sync-monitor.repository';
import {
  SyncModule,
  SyncStatus,
  ISyncSnapshot,
  IQueueHealth,
  IRateLimitStatus,
  ISyncHistory,
  ISyncIssue,
  SyncAggregateData,
} from '../interfaces';

interface ISyncJobRecord {
  id: string;
  workspaceId?: string;
  module?: string;
  provider?: string;
  accountId?: string;
  status: string;
  startedAt?: Date;
  completedAt?: Date;
  itemsProcessed?: number;
  itemsTotal?: number;
  itemsFailed?: number;
  currentPage?: number;
  nextCursor?: string;
  errorCount?: number;
  lastError?: string;
  lastErrorAt?: Date;
  consecutiveFailures?: number;
  triggeredBy?: string;
}

interface ISyncScheduleRecord {
  completedAt?: Date;
  nextRunAt?: Date;
}

interface IRateLimitRecord {
  isLimited: boolean;
  limitResetAt?: Date;
  requestsRemaining?: number;
  requestsLimit?: number;
  retryAfter?: number;
}

@Injectable()
export class SyncAggregator {
  constructor(
    private readonly repository: SyncMonitorRepository,
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

  async aggregateSyncData(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ): Promise<SyncAggregateData> {
    const [snapshot, queueHealth, rateLimitStatus, recentHistory, activeIssues] =
      await Promise.all([
        this.buildSnapshot(workspaceId, module, provider, accountId),
        this.getQueueHealth(workspaceId, module),
        this.getRateLimitStatus(workspaceId, module, provider, accountId),
        this.repository.findRecentHistory(
          workspaceId,
          module,
          provider,
          accountId,
          10,
        ),
        this.repository.findActiveIssues(workspaceId, module),
      ]);

    return {
      snapshot,
      queueHealth,
      rateLimitStatus,
      recentHistory: recentHistory.map((job) => this.mapToSyncHistory(job)),
      activeIssues: activeIssues as unknown as ISyncIssue[],
    };
  }

  async aggregateAllSyncs(workspaceId: string): Promise<SyncAggregateData[]> {
    const modules = Object.values(SyncModule);
    const results: SyncAggregateData[] = [];

    for (const module of modules) {
      const jobs = await this.repository.findJobsByStatus(
        workspaceId,
        [SyncStatus.QUEUED, SyncStatus.RUNNING, SyncStatus.PAUSED, SyncStatus.COMPLETED, SyncStatus.FAILED],
        module,
      );

      const groupedByProvider = this.groupByProvider(jobs);

      for (const [provider, providerJobs] of groupedByProvider.entries()) {
        const groupedByAccount = this.groupByAccount(providerJobs);

        for (const [accountId, accountJobs] of groupedByAccount.entries()) {
          const data = await this.aggregateSyncData(
            workspaceId,
            module,
            provider,
            accountId || undefined,
          );
          results.push(data);
        }
      }
    }

    return results;
  }

  private async buildSnapshot(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ): Promise<ISyncSnapshot> {
    const activeJobs = (await this.repository.findJobsByProvider(
      workspaceId,
      provider,
      accountId,
    )) as unknown as ISyncJobRecord[];

    const currentJob = activeJobs.find(
      (job) =>
        job.module === module &&
        [SyncStatus.QUEUED, SyncStatus.RUNNING, SyncStatus.PAUSED].includes(job.status as SyncStatus),
    );

    const lastSuccessfulSync = (await this.repository.findLastSuccessfulSync(
      workspaceId,
      module,
      provider,
      accountId,
    )) as unknown as ISyncScheduleRecord | null;

    const nextScheduledSync = (await this.repository.findNextScheduledSync(
      workspaceId,
      module,
      provider,
      accountId,
    )) as unknown as ISyncScheduleRecord | null;

    const status = this.determineStatus(currentJob);
    const duration = this.calculateDuration(currentJob);
    const throughput = this.calculateThroughput(currentJob);
    const successRate = this.calculateSuccessRate(currentJob);

    return {
      workspaceId,
      module,
      provider,
      accountId,
      status,
      jobId: currentJob?.id,
      startedAt: currentJob?.startedAt,
      completedAt: currentJob?.completedAt,
      duration,
      itemsProcessed: currentJob?.itemsProcessed || 0,
      itemsTotal: currentJob?.itemsTotal,
      itemsFailed: currentJob?.itemsFailed || 0,
      successRate,
      throughput,
      currentPage: currentJob?.currentPage,
      nextCursor: currentJob?.nextCursor,
      errorCount: currentJob?.errorCount || 0,
      lastError: currentJob?.lastError,
      lastErrorAt: currentJob?.lastErrorAt,
      consecutiveFailures: currentJob?.consecutiveFailures || 0,
      lastSuccessfulSyncAt: lastSuccessfulSync?.completedAt,
      nextScheduledSyncAt: nextScheduledSync?.nextRunAt,
    };
  }

  private async getQueueHealth(
    workspaceId: string,
    module: SyncModule,
  ): Promise<IQueueHealth | undefined> {
    const queue = this.getQueueForModule(module);
    if (!queue) return undefined;

    try {
      const [counts, isPaused, jobs] = await Promise.all([
        queue.getJobCounts(),
        queue.isPaused(),
        queue.getCompleted(0, 100),
      ]);

      const avgProcessingTime = this.calculateAvgProcessingTime(jobs);
      const throughput = this.calculateQueueThroughput(jobs);
      const errorRate = this.calculateQueueErrorRate(counts);
      const lastJob = jobs[0];

      return {
        queueName: queue.name,
        workspaceId,
        module,
        waiting: counts.waiting || 0,
        active: counts.active || 0,
        completed: counts.completed || 0,
        failed: counts.failed || 0,
        delayed: counts.delayed || 0,
        paused: counts.paused || 0,
        isPaused,
        isHealthy: this.isQueueHealthy(counts, isPaused),
        avgProcessingTime,
        throughput,
        errorRate,
        lastJobAt: lastJob?.finishedOn
          ? new Date(lastJob.finishedOn)
          : undefined,
      };
    } catch (error) {
      return undefined;
    }
  }

  private async getRateLimitStatus(
    workspaceId: string,
    module: SyncModule,
    provider: string,
    accountId?: string,
  ): Promise<IRateLimitStatus | undefined> {
    const rateLimitRecord = (await this.repository.findRateLimitRecord(
      workspaceId,
      module,
      provider,
      accountId || '',
    )) as unknown as IRateLimitRecord | null;

    if (!rateLimitRecord) return undefined;

    return {
      workspaceId,
      provider,
      accountId,
      module,
      isLimited: rateLimitRecord.isLimited,
      limitResetAt: rateLimitRecord.limitResetAt,
      requestsRemaining: rateLimitRecord.requestsRemaining,
      requestsLimit: rateLimitRecord.requestsLimit,
      retryAfter: rateLimitRecord.retryAfter,
    };
  }

  private mapToSyncHistory(job: any): ISyncHistory {
    return {
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
    };
  }

  private determineStatus(job: any): SyncStatus {
    if (!job) return SyncStatus.IDLE;
    return job.status as SyncStatus;
  }

  private calculateDuration(job: any): number | undefined {
    if (!job?.startedAt) return undefined;
    const endTime = job.completedAt || new Date();
    return endTime.getTime() - job.startedAt.getTime();
  }

  private calculateThroughput(job: any): number | undefined {
    if (!job?.startedAt || job.itemsProcessed === 0) return undefined;
    const duration = this.calculateDuration(job);
    if (!duration || duration === 0) return undefined;
    return (job.itemsProcessed / duration) * 1000 * 60; // items per minute
  }

  private calculateSuccessRate(job: any): number {
    if (!job || job.itemsProcessed === 0) return 0;
    const successCount = job.itemsProcessed - (job.itemsFailed || 0);
    return (successCount / job.itemsProcessed) * 100;
  }

  private calculateAvgProcessingTime(jobs: any[]): number | undefined {
    if (jobs.length === 0) return undefined;
    const total = jobs.reduce((sum, job) => {
      if (job.finishedOn && job.processedOn) {
        return sum + (job.finishedOn - job.processedOn);
      }
      return sum;
    }, 0);
    return total / jobs.length;
  }

  private calculateQueueThroughput(jobs: any[]): number | undefined {
    if (jobs.length === 0) return undefined;
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const recentJobs = jobs.filter(
      (job) => job.finishedOn && job.finishedOn > oneHourAgo,
    );
    return recentJobs.length;
  }

  private calculateQueueErrorRate(counts: any): number {
    const total = counts.completed + counts.failed;
    if (total === 0) return 0;
    return (counts.failed / total) * 100;
  }

  private isQueueHealthy(counts: any, isPaused: boolean): boolean {
    if (isPaused) return false;
    if (counts.waiting > 1000) return false;
    if (counts.failed > counts.completed) return false;
    return true;
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

  private groupByProvider(jobs: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();
    for (const job of jobs) {
      const provider = job.provider;
      if (!grouped.has(provider)) {
        grouped.set(provider, []);
      }
      grouped.get(provider)!.push(job);
    }
    return grouped;
  }

  private groupByAccount(jobs: any[]): Map<string | null, any[]> {
    const grouped = new Map<string | null, any[]>();
    for (const job of jobs) {
      const accountId = job.accountId || null;
      if (!grouped.has(accountId)) {
        grouped.set(accountId, []);
      }
      grouped.get(accountId)!.push(job);
    }
    return grouped;
  }
}
