import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { IdempotencyRecord } from './adapter.types';

/**
 * AdapterIdempotencyService
 *
 * Prevents duplicate write operations by tracking idempotency keys.
 * Uses an in-memory store. In production, back this with Redis.
 */
@Injectable()
export class AdapterIdempotencyService {
  private readonly logger = new Logger(AdapterIdempotencyService.name);
  private readonly store = new Map<string, IdempotencyRecord>();
  private readonly DEFAULT_TTL_MS = 24 * 60 * 60 * 1_000; // 24 hours

  /**
   * Builds a deterministic idempotency key from request parameters.
   */
  buildKey(
    workspaceId: string,
    providerCode: string,
    operation: string,
    params: Record<string, unknown>,
  ): string {
    const normalized = JSON.stringify({ workspaceId, providerCode, operation, params }, sortKeys);
    return `idm:${createHash('sha256').update(normalized).digest('hex').slice(0, 32)}`;
  }

  /**
   * Computes a deterministic hash for request body.
   */
  hashRequest(params: Record<string, unknown>): string {
    return createHash('sha256').update(JSON.stringify(params, sortKeys)).digest('hex');
  }

  /**
   * Returns an existing completed record if one exists and has not expired.
   */
  findCompleted(key: string): IdempotencyRecord | null {
    const record = this.store.get(key);
    if (!record) return null;
    if (record.status !== 'COMPLETED') return null;
    if (record.expiresAt < new Date()) {
      this.store.delete(key);
      return null;
    }
    return record;
  }

  /**
   * Checks if a pending record exists (another request is in-flight with same key).
   */
  isPending(key: string): boolean {
    const record = this.store.get(key);
    if (!record) return false;
    if (record.expiresAt < new Date()) {
      this.store.delete(key);
      return false;
    }
    return record.status === 'PENDING';
  }

  /**
   * Marks a key as in-flight (PENDING).
   */
  markPending(
    key: string,
    workspaceId: string,
    providerCode: string,
    operation: string,
    requestHash: string,
  ): void {
    const record: IdempotencyRecord = {
      key,
      providerCode,
      workspaceId,
      operation,
      requestHash,
      status: 'PENDING',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.DEFAULT_TTL_MS),
    };
    this.store.set(key, record);
    this.logger.debug(`[${providerCode}] Idempotency PENDING: ${key}`);
  }

  /**
   * Marks a key as COMPLETED and stores the response hash.
   */
  markCompleted(key: string, responseHash?: string): void {
    const record = this.store.get(key);
    if (record) {
      record.status = 'COMPLETED';
      record.responseHash = responseHash ?? null;
      this.logger.debug(`[${record.providerCode}] Idempotency COMPLETED: ${key}`);
    }
  }

  /**
   * Marks a key as FAILED (allows retry).
   */
  markFailed(key: string): void {
    const record = this.store.get(key);
    if (record) {
      record.status = 'FAILED';
      this.logger.debug(`[${record.providerCode}] Idempotency FAILED: ${key}`);
    }
  }

  /**
   * Removes expired records (call periodically).
   */
  evictExpired(): number {
    const now = new Date();
    let count = 0;
    for (const [key, record] of this.store.entries()) {
      if (record.expiresAt < now) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }
}

function sortKeys(_: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
    );
  }
  return value;
}
