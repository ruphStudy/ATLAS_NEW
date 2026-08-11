import { Injectable, Logger } from '@nestjs/common';
import {
  ICatalogSyncJob,
  SyncJobStatus,
  SyncMetricsSnapshot,
} from '../interfaces';

interface MetricsEntry {
  workspaceId: string;
  accountId: string;
  providerKey: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  partialJobs: number;
  totalItemsSynced: number;
  totalItemsFailed: number;
  totalConflicts: number;
  durationMsSamples: number[];
  lastSyncAt: Date | null;
  lastSyncStatus: SyncJobStatus | null;
}

@Injectable()
export class CatalogSyncMetrics {
  private readonly logger = new Logger(CatalogSyncMetrics.name);
  private readonly data = new Map<string, MetricsEntry>();

  record(job: ICatalogSyncJob): void {
    const key = `${job.workspaceId}:${job.accountId}`;
    const entry = this.data.get(key) ?? this.makeEntry(job);

    entry.totalJobs++;
    if (job.status === SyncJobStatus.COMPLETED) entry.completedJobs++;
    else if (job.status === SyncJobStatus.FAILED) entry.failedJobs++;
    else if (job.status === SyncJobStatus.PARTIAL) entry.partialJobs++;

    entry.totalItemsSynced += job.processedItems - job.failedItems;
    entry.totalItemsFailed += job.failedItems;
    entry.totalConflicts += job.conflictItems;

    if (job.startedAt && job.completedAt) {
      const durationMs = job.completedAt.getTime() - job.startedAt.getTime();
      entry.durationMsSamples.push(durationMs);
      if (entry.durationMsSamples.length > 50) entry.durationMsSamples.shift();
    }

    entry.lastSyncAt = job.completedAt ?? job.startedAt ?? new Date();
    entry.lastSyncStatus = job.status;

    this.data.set(key, entry);
  }

  getSnapshot(workspaceId: string, accountId: string): SyncMetricsSnapshot | null {
    const key = `${workspaceId}:${accountId}`;
    const entry = this.data.get(key);
    if (!entry) return null;
    return this.toSnapshot(entry);
  }

  getAllSnapshots(workspaceId: string): SyncMetricsSnapshot[] {
    const result: SyncMetricsSnapshot[] = [];
    for (const [key, entry] of this.data.entries()) {
      if (key.startsWith(`${workspaceId}:`)) result.push(this.toSnapshot(entry));
    }
    return result;
  }

  reset(workspaceId?: string): void {
    if (workspaceId) {
      for (const key of this.data.keys()) {
        if (key.startsWith(`${workspaceId}:`)) this.data.delete(key);
      }
    } else {
      this.data.clear();
    }
  }

  private toSnapshot(entry: MetricsEntry): SyncMetricsSnapshot {
    const avgDurationMs =
      entry.durationMsSamples.length > 0
        ? Math.round(entry.durationMsSamples.reduce((a, b) => a + b, 0) / entry.durationMsSamples.length)
        : 0;
    return {
      workspaceId: entry.workspaceId,
      accountId: entry.accountId,
      providerKey: entry.providerKey,
      totalJobs: entry.totalJobs,
      completedJobs: entry.completedJobs,
      failedJobs: entry.failedJobs,
      partialJobs: entry.partialJobs,
      totalItemsSynced: entry.totalItemsSynced,
      totalItemsFailed: entry.totalItemsFailed,
      totalConflicts: entry.totalConflicts,
      avgDurationMs,
      lastSyncAt: entry.lastSyncAt,
      lastSyncStatus: entry.lastSyncStatus,
    };
  }

  private makeEntry(job: ICatalogSyncJob): MetricsEntry {
    return {
      workspaceId: job.workspaceId,
      accountId: job.accountId,
      providerKey: job.providerKey,
      totalJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
      partialJobs: 0,
      totalItemsSynced: 0,
      totalItemsFailed: 0,
      totalConflicts: 0,
      durationMsSamples: [],
      lastSyncAt: null,
      lastSyncStatus: null,
    };
  }
}
