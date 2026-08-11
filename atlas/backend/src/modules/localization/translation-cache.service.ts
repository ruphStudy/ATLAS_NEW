import { Injectable } from '@nestjs/common';
import { TRANSLATION_CACHE_TTL_MS } from './constants';

interface ICacheEntry {
  value: string;
  expiresAt: number;
}

/**
 * TranslationCacheService — in-process cache of resolved translation
 * values, keyed by `${namespaceKey}:${key}:${localeCode}`. Shared as a
 * singleton between `LocalizationService` (populates on translate, and
 * invalidates synchronously on any translation write) and
 * `LocalizationEventWorker` (invalidates when a change event is consumed)
 * — the same event-driven-cache pattern used by the Settings Framework,
 * Roles & Permissions and Search Framework this session.
 */
@Injectable()
export class TranslationCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(namespaceKey: string, key: string, localeCode: string): string {
    return `${namespaceKey}:${key}:${localeCode}`;
  }

  get(key: string): string | undefined {
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

  set(key: string, value: string, ttlMs: number = TRANSLATION_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** A single key's translation changed — every locale variant of it could be affected by fallback re-resolution, so clear all cached entries for that namespace+key. */
  invalidateKey(namespaceKey: string, key: string): void {
    const prefix = `${namespaceKey}:${key}:`;
    for (const cacheKey of this.store.keys()) {
      if (cacheKey.startsWith(prefix)) {
        this.store.delete(cacheKey);
      }
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
