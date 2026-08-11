import { Injectable, Logger } from '@nestjs/common';
import { IInventorySyncJob, IInventorySyncSchedule, InventorySyncMetricsSnapshot, SyncJobStatus } from '../interfaces';

@Injectable()
export class InventorySyncMetrics {
  private readonly snapshots = new Map<string, InventorySyncMetricsSnapshot>();

  private key(workspaceId: string, accountId: string): string {
    return `${workspaceId}:${accountId}`;
  }

  record(job: IInventorySyncJob): void {
    const k = this.key(job.workspaceId, job.accountId);
    const snap = this.snapshots.get(k) ?? {
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      partialJobs: 0,
      totalItemsSynced: 0,
      totalItemsFailed: 0,
      totalAdjustments: 0,
      totalConflicts: 0,
      avgDurationMs: 0,
      lastSyncAt: null,
      lastSyncStatus: null,
    };

    snap.totalJobs++;
    if (job.status === SyncJobStatus.COMPLETED) snap.completedJobs++;
    else if (job.status === SyncJobStatus.FAILED) snap.failedJobs++;
    else if (job.status === SyncJobStatus.PARTIAL) snap.partialJobs++;

    snap.totalItemsSynced += (job.pushedItems ?? 0) + (job.pulledItems ?? 0);
    snap.totalItemsFailed += job.failedItems ?? 0;
    snap.totalAdjustments += job.adjustedItems ?? 0;
    snap.totalConflicts += job.conflictItems ?? 0;

    if (job.startedAt && job.completedAt) {
      const durationMs = job.completedAt.getTime() - job.startedAt.getTime();
      snap.avgDurationMs = Math.round(
        (snap.avgDurationMs * (snap.totalJobs - 1) + durationMs) / snap.totalJobs,
      );
    }

    snap.lastSyncAt = job.completedAt ?? new Date();
    snap.lastSyncStatus = job.status;

    this.snapshots.set(k, snap);
  }

  getSnapshot(workspaceId: string, accountId: string): InventorySyncMetricsSnapshot | null {
    return this.snapshots.get(this.key(workspaceId, accountId)) ?? null;
  }

  getAllSnapshots(workspaceId: string): InventorySyncMetricsSnapshot[] {
    const result: InventorySyncMetricsSnapshot[] = [];
    for (const [k, v] of this.snapshots) {
      if (k.startsWith(`${workspaceId}:`)) result.push(v);
    }
    return result;
  }
}
