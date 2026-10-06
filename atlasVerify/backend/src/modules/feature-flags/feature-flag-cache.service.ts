import { Injectable } from '@nestjs/common';
import { FEATURE_FLAG_CACHE_TTL_MS } from './constants';
import { IFeatureFlagEvaluationResult } from './interfaces';

interface ICacheEntry {
  value: IFeatureFlagEvaluationResult;
  expiresAt: number;
}

/** In-process resolved-flag cache — the same shape as `PlanCacheService`/`SettingsCacheService`/`SubscriptionCacheService` (no shared/generic cache abstraction exists in this codebase to reuse instead). Invalidated event-driven by the event worker on any definition/override write. */
@Injectable()
export class FeatureFlagCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(flagKey: string, context: { workspaceId?: string; userId?: string; environment?: string }): string {
    return `${flagKey}::${context.workspaceId ?? '-'}::${context.userId ?? '-'}::${context.environment ?? '-'}`;
  }

  get(key: string): IFeatureFlagEvaluationResult | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: IFeatureFlagEvaluationResult, ttlMs: number = FEATURE_FLAG_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Invalidates every cached evaluation for a given flag key, regardless of context — the correct granularity since ANY definition/override change for that flag can change the resolved outcome for any context. */
  invalidateFlag(flagKey: string): void {
    this.invalidateByPredicate((key) => key.startsWith(`${flagKey}::`));
  }

  invalidateAll(): void {
    this.store.clear();
  }

  private invalidateByPredicate(predicate: (key: string) => boolean): void {
    for (const key of this.store.keys()) {
      if (predicate(key)) {
        this.store.delete(key);
      }
    }
  }
}
