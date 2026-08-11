import { Injectable } from '@nestjs/common';
import { SyncDirection, SyncJobStatus } from '../interfaces';
import { MP_LISTING_SYNC_CONSTANTS } from '../constants';

interface LockEntry {
  jobId: string;
  correlationId: string;
  lockedAt: Date;
}

@Injectable()
export class ListingSyncStateManager {
  private readonly locks = new Map<string, LockEntry>();
  private readonly cancelled = new Set<string>();

  private lockKey(workspaceId: string, accountId: string, direction: SyncDirection): string {
    return `${workspaceId}:${accountId}:${direction}`;
  }

  lock(workspaceId: string, accountId: string, direction: SyncDirection, jobId: string, correlationId: string): void {
    this.locks.set(this.lockKey(workspaceId, accountId, direction), { jobId, correlationId, lockedAt: new Date() });
  }

  unlock(workspaceId: string, accountId: string, direction: SyncDirection): void {
    this.locks.delete(this.lockKey(workspaceId, accountId, direction));
  }

  isLocked(workspaceId: string, accountId: string, direction: SyncDirection): boolean {
    const entry = this.locks.get(this.lockKey(workspaceId, accountId, direction));
    if (!entry) return false;
    // Expire stale locks
    if (Date.now() - entry.lockedAt.getTime() > MP_LISTING_SYNC_CONSTANTS.JOB_LOCK_TTL_MS) {
      this.locks.delete(this.lockKey(workspaceId, accountId, direction));
      return false;
    }
    return true;
  }

  getLockedJobId(workspaceId: string, accountId: string, direction: SyncDirection): string | null {
    return this.locks.get(this.lockKey(workspaceId, accountId, direction))?.jobId ?? null;
  }

  markCancelled(jobId: string): void {
    this.cancelled.add(jobId);
  }

  isCancelled(jobId: string): boolean {
    return this.cancelled.has(jobId);
  }

  clearCancelledMark(jobId: string): void {
    this.cancelled.delete(jobId);
  }

  isTerminal(status: SyncJobStatus): boolean {
    return (MP_LISTING_SYNC_CONSTANTS.TERMINAL_STATUSES as readonly SyncJobStatus[]).includes(status);
  }
}
