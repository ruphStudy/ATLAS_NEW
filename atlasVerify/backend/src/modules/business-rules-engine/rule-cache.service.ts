import { Injectable } from '@nestjs/common';
import { RULE_CACHE_TTL_MS } from './constants';
import { IRule } from './interfaces';

interface ICacheEntry {
  value: IRule[];
  expiresAt: number;
}

/**
 * RuleCacheService — in-process cache of the PUBLISHED rules matched for a
 * given (scope keys, module, triggerType, triggerRef) evaluation key. Shared
 * as a singleton between `BusinessRulesEngineService` (populates on
 * evaluate, invalidates synchronously on writes) and
 * `BusinessRulesEngineEventWorker` (invalidates when a lifecycle event is
 * consumed) — the same event-driven-cache pattern used by the Settings
 * Framework, Roles & Permissions, Search Framework, Localization and Theme
 * Management this session.
 */
@Injectable()
export class RuleCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(scopeKeys: string[], module: string, triggerType: string, triggerRef?: string): string {
    return `${scopeKeys.slice().sort().join(',')}:${module}:${triggerType}:${triggerRef ?? ''}`;
  }

  get(key: string): IRule[] | undefined {
    const entry = this.store.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: IRule[], ttlMs: number = RULE_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
