import { Injectable } from '@nestjs/common';
import { IOrderSyncJob, SyncJobStatus } from '../interfaces';

export interface MetricsSnapshot {
  workspaceId: string;
  accountId: string;
  totalJobs: number;
  completedJobs: number;
  partialJobs: number;
  failedJobs: number;
  cancelledJobs: number;
  totalOrders: number;
  importedOrders: number;
  updatedOrders: number;
  cancelledOrders: number;
  avgDurationMs: number | null;
}

@Injectable()
export class OrderSyncMetrics {
  private readonly snapshots = new Map<string, MetricsSnapshot>();

  record(job: IOrderSyncJob): void {
    const key = this.buildKey(job.workspaceId, job.accountId);
    const existing = this.snapshots.get(key) ?? this.initSnapshot(job.workspaceId, job.accountId);

    existing.totalJobs++;
    if (job.status === SyncJobStatus.COMPLETED) existing.completedJobs++;
    else if (job.status === SyncJobStatus.PARTIAL) existing.partialJobs++;
    else if (job.status === SyncJobStatus.FAILED) existing.failedJobs++;
    else if (job.status === SyncJobStatus.CANCELLED) existing.cancelledJobs++;

    existing.totalOrders += job.processedItems;
    existing.importedOrders += job.importedOrders;
    existing.updatedOrders += job.updatedOrders;
    existing.cancelledOrders += job.cancelledOrders;

    if (job.startedAt && job.completedAt) {
      const duration = job.completedAt.getTime() - job.startedAt.getTime();
      existing.avgDurationMs = existing.avgDurationMs
        ? (existing.avgDurationMs * (existing.totalJobs - 1) + duration) / existing.totalJobs
        : duration;
    }

    this.snapshots.set(key, existing);
  }

  getSnapshot(workspaceId: string, accountId: string): MetricsSnapshot {
    const key = this.buildKey(workspaceId, accountId);
    return this.snapshots.get(key) ?? this.initSnapshot(workspaceId, accountId);
  }

  getAllSnapshots(workspaceId: string): MetricsSnapshot[] {
    return Array.from(this.snapshots.values()).filter((s) => s.workspaceId === workspaceId);
  }

  private buildKey(workspaceId: string, accountId: string): string {
    return `${workspaceId}:${accountId}`;
  }

  private initSnapshot(workspaceId: string, accountId: string): MetricsSnapshot {
    return {
      workspaceId,
      accountId,
      totalJobs: 0,
      completedJobs: 0,
      partialJobs: 0,
      failedJobs: 0,
      cancelledJobs: 0,
      totalOrders: 0,
      importedOrders: 0,
      updatedOrders: 0,
      cancelledOrders: 0,
      avgDurationMs: null,
    };
  }
}
