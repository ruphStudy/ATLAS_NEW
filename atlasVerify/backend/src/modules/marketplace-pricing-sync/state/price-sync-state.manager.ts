import { Injectable } from '@nestjs/common';
import { PriceSyncRepository } from '../repository/price-sync.repository';
import { SyncStatus, ItemSyncStatus } from '../interfaces';

@Injectable()
export class PriceSyncStateManager {
  constructor(private readonly repository: PriceSyncRepository) {}

  async startJob(jobId: string, workspaceId: string): Promise<void> {
    await this.repository.updateJob(jobId, workspaceId, {
      status: SyncStatus.RUNNING,
      startedAt: new Date(),
    });
  }

  async completeJob(jobId: string, workspaceId: string): Promise<void> {
    await this.repository.updateJob(jobId, workspaceId, {
      status: SyncStatus.COMPLETED,
      completedAt: new Date(),
    });
  }

  async failJob(jobId: string, workspaceId: string, error: string): Promise<void> {
    await this.repository.updateJob(jobId, workspaceId, {
      status: SyncStatus.FAILED,
      completedAt: new Date(),
      errorMessage: error,
    });
  }

  async cancelJob(jobId: string, workspaceId: string): Promise<void> {
    await this.repository.updateJob(jobId, workspaceId, {
      status: SyncStatus.CANCELLED,
      completedAt: new Date(),
    });
  }

  async updateProgress(
    jobId: string,
    workspaceId: string,
    data: {
      totalItems?: number;
      processedItems?: number;
      successCount?: number;
      failedCount?: number;
      skippedCount?: number;
      conflictCount?: number;
      cursor?: string;
    },
  ): Promise<void> {
    await this.repository.updateJob(jobId, workspaceId, data);
  }

  async incrementCounters(
    jobId: string,
    workspaceId: string,
    counters: {
      processed?: number;
      success?: number;
      failed?: number;
      skipped?: number;
      conflict?: number;
    },
  ): Promise<void> {
    const job = await this.repository.getJob(jobId, workspaceId);
    if (!job) return;

    await this.repository.updateJob(jobId, workspaceId, {
      processedItems: job.processedItems + (counters.processed || 0),
      successCount: job.successCount + (counters.success || 0),
      failedCount: job.failedCount + (counters.failed || 0),
      skippedCount: job.skippedCount + (counters.skipped || 0),
      conflictCount: job.conflictCount + (counters.conflict || 0),
    });
  }

  async recordItemResult(
    jobId: string,
    workspaceId: string,
    data: {
      externalPriceId: string;
      sku?: string;
      status: ItemSyncStatus;
      operation?: string;
      errorMessage?: string;
      metadata?: Record<string, any>;
    },
  ): Promise<void> {
    await this.repository.createItemResult({
      jobId,
      workspaceId,
      ...data,
    });
  }

  async isJobLocked(workspaceId: string, accountId: string): Promise<boolean> {
    const activeJobs = await this.repository.findJobs({
      workspaceId,
      accountId,
      status: SyncStatus.RUNNING,
      limit: 1,
    });
    return activeJobs.items.length > 0;
  }

  async getJobProgress(jobId: string, workspaceId: string) {
    const job = await this.repository.getJob(jobId, workspaceId);
    if (!job) return null;

    const percentage = job.totalItems > 0
      ? Math.round((job.processedItems / job.totalItems) * 100)
      : 0;

    return {
      status: job.status,
      totalItems: job.totalItems,
      processedItems: job.processedItems,
      successCount: job.successCount,
      failedCount: job.failedCount,
      skippedCount: job.skippedCount,
      conflictCount: job.conflictCount,
      percentage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      errorMessage: job.errorMessage,
    };
  }
}
