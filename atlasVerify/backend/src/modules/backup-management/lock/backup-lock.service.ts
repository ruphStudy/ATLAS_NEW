import { Injectable, Logger } from '@nestjs/common';
import { BackupManagementRepository } from '../backup-management.repository';
import { BACKUP_MANAGEMENT_CONSTANTS } from '../constants';
import { BackupConcurrentOperationLockedException } from '../exceptions/backup-management.exceptions';

/**
 * BackupLockService
 *
 * Prevents duplicate/concurrent backup operations against the same
 * policy/scope via a unique-constraint-backed lock row with a TTL —
 * mirrors `DrRecoveryLockService` (Disaster Recovery) exactly, scoped
 * to backup policies/targets instead of recovery scopes.
 */
@Injectable()
export class BackupLockService {
  private readonly logger = new Logger(BackupLockService.name);

  constructor(private readonly repository: BackupManagementRepository) {}

  async acquire(scopeKey: string, jobId: string): Promise<void> {
    await this.repository.reclaimExpiredLock(scopeKey, new Date());

    const expiresAt = new Date(Date.now() + BACKUP_MANAGEMENT_CONSTANTS.LOCK_TTL_MS);
    const lock = await this.repository.acquireLock(scopeKey, jobId, expiresAt);
    if (!lock) {
      throw new BackupConcurrentOperationLockedException(scopeKey);
    }
  }

  async release(scopeKey: string): Promise<void> {
    try {
      await this.repository.releaseLock(scopeKey);
    } catch (err) {
      this.logger.warn(`Failed to release backup lock for scope '${scopeKey}': ${(err as Error).message}`);
    }
  }

  buildScopeKey(input: { scope: 'FULL_PLATFORM' | 'TENANT' | 'SERVICE'; workspaceId?: string; service?: string; dataType?: string }): string {
    if (input.scope === 'FULL_PLATFORM') {
      return 'full-platform';
    }
    if (input.scope === 'TENANT' && input.workspaceId) {
      return `workspace:${input.workspaceId}`;
    }
    return `service:${input.service ?? 'unknown'}:${input.dataType ?? 'unknown'}`;
  }
}
