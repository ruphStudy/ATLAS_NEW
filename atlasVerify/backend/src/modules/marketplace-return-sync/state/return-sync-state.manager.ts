import { Injectable } from '@nestjs/common';
import { SyncDirection, SyncJobStatus } from '../interfaces';
import { MP_RETURN_SYNC_CONSTANTS } from '../constants';

interface LockEntry {
  jobId: string;
  correlationId: string;
  lockedAt: number;
}

@Injectable()
export class ReturnSyncStateManager {
  private readonly locks = new Map<string, LockEntry>();
  private readonly cancelledJobs = new Set<string>();

  lock(workspaceId: string, accountId: string, direction: SyncDirection, jobId: string, correlationId: string): void {
    const key = this.buildKey(workspaceId, accountId, direction);
    this.locks.set(key, { jobId, correlationId, lockedAt: Date.now() });
  }

  unlock(workspaceId: string, accountId: string, direction: SyncDirection): void {
    const key = this.buildKey(workspaceId, accountId, direction);
    this.locks.delete(key);
  }

  isLocked(workspaceId: string, accountId: string, direction: SyncDirection): boolean {
    const key = this.buildKey(workspaceId, accountId, direction);
    const entry = this.locks.get(key);
    if (!entry) return false;
    if (Date.now() - entry.lockedAt > MP_RETURN_SYNC_CONSTANTS.LOCK_TTL_MS) {
      this.locks.delete(key);
      return false;
    }
    return true;
  }

  getLockedJobId(workspaceId: string, accountId: string, direction: SyncDirection): string | null {
    const key = this.buildKey(workspaceId, accountId, direction);
    return this.locks.get(key)?.jobId ?? null;
  }

  markCancelled(jobId: string): void {
    this.cancelledJobs.add(jobId);
  }

  isCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  clearCancelledMark(jobId: string): void {
    this.cancelledJobs.delete(jobId);
  }

  isTerminal(status: SyncJobStatus): boolean {
    return MP_RETURN_SYNC_CONSTANTS.TERMINAL_STATUSES.includes(status);
  }

  private buildKey(workspaceId: string, accountId: string, direction: SyncDirection): string {
    return `${workspaceId}:${accountId}:${direction}`;
  }
}
