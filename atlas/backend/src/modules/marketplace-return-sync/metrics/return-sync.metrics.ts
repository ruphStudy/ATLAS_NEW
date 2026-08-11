import { Injectable } from '@nestjs/common';
import { ReturnSyncRepository } from '../repository/return-sync.repository';
import { SyncJobStatus } from '../interfaces';

export interface ReturnSyncMetricsSnapshot {
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalReturnsImported: number;
  totalReturnsUpdated: number;
  totalReturnsApproved: number;
  totalReturnsRejected: number;
  totalReturnsRefunded: number;
  averageProcessingTimeMs: number;
}

@Injectable()
export class ReturnSyncMetrics {
  constructor(private readonly repository: ReturnSyncRepository) {}

  async getSnapshot(workspaceId: string, accountId?: string): Promise<ReturnSyncMetricsSnapshot> {
    const [jobs] = await this.repository.findJobs({ workspaceId, accountId, limit: 1000 });

    const completed = jobs.filter((j: any) => j.status === SyncJobStatus.COMPLETED);
    const failed = jobs.filter((j: any) => j.status === SyncJobStatus.FAILED);
    const partial = jobs.filter((j: any) => j.status === SyncJobStatus.PARTIAL);

    const totalImported = jobs.reduce((sum: number, j: any) => sum + (j.importedReturns ?? 0), 0);
    const totalUpdated = jobs.reduce((sum: number, j: any) => sum + (j.updatedReturns ?? 0), 0);
    const totalApproved = jobs.reduce((sum: number, j: any) => sum + (j.approvedReturns ?? 0), 0);
    const totalRejected = jobs.reduce((sum: number, j: any) => sum + (j.rejectedReturns ?? 0), 0);
    const totalRefunded = jobs.reduce((sum: number, j: any) => sum + (j.refundedReturns ?? 0), 0);

    const processingTimes = jobs
      .filter((j: any) => j.startedAt && j.completedAt)
      .map((j: any) => new Date(j.completedAt).getTime() - new Date(j.startedAt).getTime());

    const avgProcessingTime = processingTimes.length > 0
      ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
      : 0;

    return {
      totalJobs: jobs.length,
      completedJobs: completed.length,
      failedJobs: failed.length,
      partialJobs: partial.length,
      totalReturnsImported: totalImported,
      totalReturnsUpdated: totalUpdated,
      totalReturnsApproved: totalApproved,
      totalReturnsRejected: totalRejected,
      totalReturnsRefunded: totalRefunded,
      averageProcessingTimeMs: avgProcessingTime,
    };
  }
}
