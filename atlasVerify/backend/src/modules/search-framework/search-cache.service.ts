import { Injectable } from '@nestjs/common';
import { SEARCH_CACHE_TTL_MS } from './constants';
import { ISearchResultPage } from './interfaces';

interface ICacheEntry {
  value: ISearchResultPage;
  expiresAt: number;
}

/**
 * SearchCacheService — in-process cache of resolved query result pages,
 * keyed by workspace + the full query shape. Shared as a singleton between
 * `SearchFrameworkService` (populates on query, invalidates synchronously
 * on indexing writes) and `SearchFrameworkEventWorker` (invalidates when an
 * indexing event is consumed) — the same event-driven-cache pattern used by
 * the Settings Framework and Roles & Permissions.
 */
@Injectable()
export class SearchCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(workspaceId: string, query: Record<string, unknown>): string {
    const normalized = Object.keys(query)
      .sort()
      .map((k) => `${k}=${JSON.stringify(query[k])}`)
      .join('&');
    return `${workspaceId}:${normalized}`;
  }

  get(key: string): ISearchResultPage | undefined {
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

  set(key: string, value: ISearchResultPage, ttlMs: number = SEARCH_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Every indexing write can change any cached query's results — a full clear is the only precise option without per-query dependency tracking. */
  invalidateWorkspace(workspaceId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${workspaceId}:`)) {
        this.store.delete(key);
      }
    }
  }

  invalidateAll(): void {
    this.store.clear();
  }
}
