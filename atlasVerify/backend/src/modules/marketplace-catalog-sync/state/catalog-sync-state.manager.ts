import { Injectable, Logger } from '@nestjs/common';
import { SyncJobStatus } from '../interfaces';
import { MP_CATALOG_SYNC_CONSTANTS } from '../constants';

interface LockEntry {
  jobId: string;
  correlationId: string;
  lockedAt: Date;
  timer: ReturnType<typeof setTimeout>;
}

@Injectable()
export class CatalogSyncStateManager {
  private readonly logger = new Logger(CatalogSyncStateManager.name);

  /** workspaceId:accountId:direction → LockEntry */
  private readonly locks = new Map<string, LockEntry>();

  /** jobId → cancelled flag */
  private readonly cancelledJobs = new Set<string>();

  // ── Lock ──────────────────────────────────────────────────

  lock(workspaceId: string, accountId: string, direction: string, jobId: string, correlationId: string): void {
    const key = this.key(workspaceId, accountId, direction);
    const existing = this.locks.get(key);
    if (existing) clearTimeout(existing.timer);

    const timer = setTimeout(() => {
      this.logger.warn(`Auto-releasing sync lock for ${key} (TTL expired)`);
      this.locks.delete(key);
    }, MP_CATALOG_SYNC_CONSTANTS.JOB_LOCK_TTL_MS);

    this.locks.set(key, { jobId, correlationId, lockedAt: new Date(), timer });
  }

  unlock(workspaceId: string, accountId: string, direction: string): void {
    const key = this.key(workspaceId, accountId, direction);
    const entry = this.locks.get(key);
    if (entry) {
      clearTimeout(entry.timer);
      this.locks.delete(key);
    }
  }

  isLocked(workspaceId: string, accountId: string, direction: string): boolean {
    return this.locks.has(this.key(workspaceId, accountId, direction));
  }

  getLockedJobId(workspaceId: string, accountId: string, direction: string): string | null {
    return this.locks.get(this.key(workspaceId, accountId, direction))?.jobId ?? null;
  }

  // ── Cancel ────────────────────────────────────────────────

  markCancelled(jobId: string): void {
    this.cancelledJobs.add(jobId);
  }

  isCancelled(jobId: string): boolean {
    return this.cancelledJobs.has(jobId);
  }

  clearCancelledMark(jobId: string): void {
    this.cancelledJobs.delete(jobId);
  }

  // ── Terminal status check ─────────────────────────────────

  isTerminal(status: SyncJobStatus): boolean {
    return (MP_CATALOG_SYNC_CONSTANTS.TERMINAL_STATUSES as SyncJobStatus[]).includes(status);
  }

  private key(workspaceId: string, accountId: string, direction: string): string {
    return `${workspaceId}:${accountId}:${direction}`;
  }
}
