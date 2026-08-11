import { Injectable } from '@nestjs/common';
import {
  ConnectionAuthStatus,
  ConnectionCapabilityStatus,
  ConnectionErrorCategory,
  ConnectionStatus,
  ConnectionTestResult,
  IConnectionTestRecord,
} from '../interfaces';
import { ConnectionTestRepository } from '../repository/connection-test.repository';
import { MP_CONN_TEST_CONSTANTS } from '../constants';

/**
 * ConnectionTestResultManager
 *
 * Owns in-progress deduplication and persists test results.
 * Prevents concurrent duplicate tests for the same provider+account+workspace.
 */
@Injectable()
export class ConnectionTestResultManager {
  /** workspaceId:providerKey:accountId → correlationId */
  private readonly inProgress = new Map<string, string>();

  constructor(private readonly repository: ConnectionTestRepository) {}

  private lockKey(workspaceId: string, providerKey: string, accountId?: string | null): string {
    return `${workspaceId}:${providerKey.toUpperCase()}:${accountId ?? 'any'}`;
  }

  // ── Concurrency lock ──────────────────────────────────────

  isInProgress(workspaceId: string, providerKey: string, accountId?: string | null): boolean {
    return this.inProgress.has(this.lockKey(workspaceId, providerKey, accountId));
  }

  getInProgressCorrelationId(workspaceId: string, providerKey: string, accountId?: string | null): string | undefined {
    return this.inProgress.get(this.lockKey(workspaceId, providerKey, accountId));
  }

  lock(workspaceId: string, providerKey: string, correlationId: string, accountId?: string | null): void {
    const key = this.lockKey(workspaceId, providerKey, accountId);
    this.inProgress.set(key, correlationId);
    // Auto-release after TTL to prevent stuck locks
    setTimeout(() => {
      if (this.inProgress.get(key) === correlationId) {
        this.inProgress.delete(key);
      }
    }, MP_CONN_TEST_CONSTANTS.CONCURRENT_LOCK_TTL_MS);
  }

  unlock(workspaceId: string, providerKey: string, accountId?: string | null): void {
    this.inProgress.delete(this.lockKey(workspaceId, providerKey, accountId));
  }

  // ── Persistence ───────────────────────────────────────────

  async save(result: ConnectionTestResult): Promise<IConnectionTestRecord> {
    const raw = await this.repository.create({
      correlationId: result.correlationId,
      workspaceId: result.workspaceId,
      providerKey: result.providerKey.toUpperCase(),
      accountId: result.accountId ?? null,
      success: result.success,
      connectionStatus: result.connectionStatus,
      authStatus: result.authStatus,
      capabilityStatus: result.capabilityStatus,
      responseTimeMs: result.responseTimeMs ?? null,
      errorCode: result.errorCode ?? null,
      errorMessage: result.errorMessage ?? null,
      errorCategory: result.errorCategory ?? null,
      retryable: result.retryable,
      testedAt: result.testedAt,
      triggeredBy: result.triggeredBy ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return raw as unknown as IConnectionTestRecord;
  }

  async findById(id: string, workspaceId: string): Promise<IConnectionTestRecord | null> {
    const raw = await this.repository.findById(id, workspaceId);
    return raw as unknown as IConnectionTestRecord | null;
  }

  async findByCorrelationId(correlationId: string): Promise<IConnectionTestRecord | null> {
    const raw = await this.repository.findByCorrelationId(correlationId);
    return raw as unknown as IConnectionTestRecord | null;
  }
}
