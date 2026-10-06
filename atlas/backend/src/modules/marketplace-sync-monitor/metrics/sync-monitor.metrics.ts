import { Injectable } from '@nestjs/common';
import { SyncMonitorRepository } from '../repository/sync-monitor.repository';
import { SyncModule, SyncStatus } from '../interfaces';

export interface ISyncMonitorMetrics {
  workspaceId: string;
  module?: SyncModule;
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalItemsProcessed: number;
  totalItemsFailed: number;
  overallSuccessRate: number;
  avgDuration?: number;
  avgThroughput?: number;
  activeIssuesCount: number;
  unresolvedFailuresCount: number;
  stuckJobsCount: number;
  delayedJobsCount: number;
  consecutiveFailuresCount: number;
}

interface ISyncJobMetricsRecord {
  module?: string;
  itemsProcessed?: number;
  itemsFailed?: number;
  startedAt?: Date;
  completedAt?: Date;
}

@Injectable()
export class SyncMonitorMetrics {
  constructor(private readonly repository: SyncMonitorRepository) {}

  async getMetrics(
    workspaceId: string,
    module?: SyncModule,
  ): Promise<ISyncMonitorMetrics> {
    const [
      activeJobs,
      completedJobs,
      failedJobs,
      cancelledJobs,
      activeIssues,
      unresolvedFailures,
      stuckJobs,
      repeatedlyFailingJobs,
    ] = await Promise.all([
      this.repository.findJobsByStatus(
        workspaceId,
        [SyncStatus.QUEUED, SyncStatus.RUNNING, SyncStatus.PAUSED],
        module,
      ),
      this.repository.findJobsByStatus(workspaceId, SyncStatus.COMPLETED, module),
      this.repository.findJobsByStatus(workspaceId, SyncStatus.FAILED, module),
      this.repository.findJobsByStatus(workspaceId, SyncStatus.CANCELLED, module),
      this.repository.findActiveIssues(workspaceId, module),
      module
        ? this.repository.findUnresolvedItemFailures(workspaceId, module)
        : [],
      this.repository.findStuckJobs(workspaceId),
      this.repository.findRepeatedlyFailingJobs(workspaceId),
    ]);

    const allJobs = [
      ...activeJobs,
      ...completedJobs,
      ...failedJobs,
      ...cancelledJobs,
    ] as unknown as ISyncJobMetricsRecord[];

    const totalItemsProcessed = allJobs.reduce(
      (sum, job) => sum + (job.itemsProcessed || 0),
      0,
    );

    const totalItemsFailed = allJobs.reduce(
      (sum, job) => sum + (job.itemsFailed || 0),
      0,
    );

    const overallSuccessRate =
      totalItemsProcessed > 0
        ? ((totalItemsProcessed - totalItemsFailed) / totalItemsProcessed) * 100
        : 0;

    const avgDuration = this.calculateAvgDuration(completedJobs);
    const avgThroughput = this.calculateAvgThroughput(completedJobs);

    return {
      workspaceId,
      module,
      totalJobs: allJobs.length,
      activeJobs: activeJobs.length,
      completedJobs: completedJobs.length,
      failedJobs: failedJobs.length,
      cancelledJobs: cancelledJobs.length,
      totalItemsProcessed,
      totalItemsFailed,
      overallSuccessRate,
      avgDuration,
      avgThroughput,
      activeIssuesCount: activeIssues.length,
      unresolvedFailuresCount: unresolvedFailures.length,
      stuckJobsCount: stuckJobs.filter((j) => !module || j.module === module)
        .length,
      delayedJobsCount: 0,
      consecutiveFailuresCount: repeatedlyFailingJobs.filter(
        (j) => !module || j.module === module,
      ).length,
    };
  }

  private calculateAvgDuration(jobs: any[]): number | undefined {
    const completedWithDuration = jobs.filter(
      (job) => job.startedAt && job.completedAt,
    );

    if (completedWithDuration.length === 0) return undefined;

    const totalDuration = completedWithDuration.reduce((sum, job) => {
      const duration =
        new Date(job.completedAt).getTime() -
        new Date(job.startedAt).getTime();
      return sum + duration;
    }, 0);

    return totalDuration / completedWithDuration.length;
  }

  private calculateAvgThroughput(jobs: any[]): number | undefined {
    const jobsWithThroughput = jobs.filter((job) => {
      if (!job.startedAt || !job.completedAt || !job.itemsProcessed) return false;
      const duration =
        new Date(job.completedAt).getTime() -
        new Date(job.startedAt).getTime();
      return duration > 0;
    });

    if (jobsWithThroughput.length === 0) return undefined;

    const totalThroughput = jobsWithThroughput.reduce((sum, job) => {
      const duration =
        new Date(job.completedAt).getTime() -
        new Date(job.startedAt).getTime();
      const throughput = (job.itemsProcessed / duration) * 1000 * 60; // items per minute
      return sum + throughput;
    }, 0);

    return totalThroughput / jobsWithThroughput.length;
  }
}
