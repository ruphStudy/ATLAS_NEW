import { Injectable } from '@nestjs/common';
import { PLAN_CACHE_TTL_MS } from './constants';
import { IPlan } from './interfaces';

interface ICacheEntry {
  value: IPlan | null;
  expiresAt: number;
}

/**
 * PlanCacheService — in-process cache of the resolved effective (published,
 * currently-in-effect) version per plan `code`. Shared between
 * `PlanManagementService` (populates on resolve, invalidates synchronously
 * on writes) and `PlanManagementEventWorker` (invalidates when a lifecycle
 * event is consumed) — the same event-driven-cache pattern used throughout
 * this session (Settings, Theme, Business Rules, Subscription Management).
 */
@Injectable()
export class PlanCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  get(code: string): IPlan | null | undefined {
    const entry = this.store.get(code);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(code);
      return undefined;
    }
    return entry.value;
  }

  set(code: string, value: IPlan | null, ttlMs: number = PLAN_CACHE_TTL_MS): void {
    this.store.set(code, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidateCode(code: string): void {
    this.store.delete(code);
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
