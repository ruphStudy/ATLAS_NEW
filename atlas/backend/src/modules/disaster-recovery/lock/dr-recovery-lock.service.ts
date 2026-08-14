import { Injectable, Logger } from '@nestjs/common';
import { DisasterRecoveryRepository } from '../disaster-recovery.repository';
import { DISASTER_RECOVERY_CONSTANTS } from '../constants';
import { DrConcurrentOperationLockedException } from '../exceptions/disaster-recovery.exceptions';

/**
 * DrRecoveryLockService
 *
 * Prevents duplicate/concurrent recovery operations against the same
 * scope (a workspace, a critical service, or the whole platform) via a
 * unique-constraint-backed lock row with a TTL — a crashed execution
 * never holds the scope hostage forever. This is the sole idempotency/
 * locking mechanism for recovery triggers; no separate distributed-lock
 * infrastructure is introduced.
 */
@Injectable()
export class DrRecoveryLockService {
  private readonly logger = new Logger(DrRecoveryLockService.name);

  constructor(private readonly repository: DisasterRecoveryRepository) {}

  /** Throws `DrConcurrentOperationLockedException` if the scope is already (and still validly) locked. */
  async acquire(scopeKey: string, executionId: string): Promise<void> {
    await this.repository.reclaimExpiredLock(scopeKey, new Date());

    const expiresAt = new Date(Date.now() + DISASTER_RECOVERY_CONSTANTS.LOCK_TTL_MS);
    const lock = await this.repository.acquireLock(scopeKey, executionId, expiresAt);
    if (!lock) {
      throw new DrConcurrentOperationLockedException(scopeKey);
    }
  }

  async release(scopeKey: string): Promise<void> {
    try {
      await this.repository.releaseLock(scopeKey);
    } catch (err) {
      this.logger.warn(`Failed to release recovery lock for scope '${scopeKey}': ${(err as Error).message}`);
    }
  }

  buildScopeKey(input: { scope: 'FULL_PLATFORM' | 'TENANT' | 'PARTIAL'; workspaceId?: string; criticalService?: string }): string {
    if (input.scope === 'FULL_PLATFORM') {
      return DISASTER_RECOVERY_CONSTANTS.FULL_PLATFORM_LOCK_SCOPE_KEY;
    }
    if (input.scope === 'TENANT' && input.workspaceId) {
      return `workspace:${input.workspaceId}`;
    }
    return `service:${input.criticalService ?? 'unknown'}`;
  }
}
