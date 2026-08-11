import { Injectable } from '@nestjs/common';
import { SUBSCRIPTION_CACHE_TTL_MS } from './constants';
import { ISubscription } from './interfaces';

interface ICacheEntry {
  value: ISubscription | null;
  expiresAt: number;
}

/**
 * SubscriptionCacheService — in-process cache of the resolved effective
 * subscription per workspace, keyed by `workspaceId`. Shared as a singleton
 * between `SubscriptionManagementService` (populates on resolve,
 * invalidates synchronously on writes) and
 * `SubscriptionManagementEventWorker` (invalidates when a lifecycle event
 * is consumed) — the same event-driven-cache pattern used by the Settings
 * Framework, Roles & Permissions, Theme Management and Business Rules
 * Engine this session.
 */
@Injectable()
export class SubscriptionCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  get(workspaceId: string): ISubscription | null | undefined {
    const entry = this.store.get(workspaceId);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(workspaceId);
      return undefined;
    }
    return entry.value;
  }

  set(workspaceId: string, value: ISubscription | null, ttlMs: number = SUBSCRIPTION_CACHE_TTL_MS): void {
    this.store.set(workspaceId, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidateWorkspace(workspaceId: string): void {
    this.store.delete(workspaceId);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
