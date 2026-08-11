import { Injectable } from '@nestjs/common';
import { THEME_CACHE_TTL_MS } from './constants';
import { IEffectiveTheme } from './interfaces';

interface ICacheEntry {
  value: IEffectiveTheme;
  expiresAt: number;
}

/**
 * ThemeCacheService — in-process cache of resolved effective themes, keyed
 * by workspace+user. Shared as a singleton between `ThemeManagementService`
 * (populates on resolve, invalidates synchronously on writes) and
 * `ThemeManagementEventWorker` (invalidates when a change event is
 * consumed) — the same event-driven-cache pattern used by the Settings
 * Framework, Roles & Permissions, Search Framework and Localization this
 * session.
 */
@Injectable()
export class ThemeCacheService {
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(workspaceId: string, userId: string): string {
    return `${workspaceId}:${userId}`;
  }

  get(key: string): IEffectiveTheme | undefined {
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

  set(key: string, value: IEffectiveTheme, ttlMs: number = THEME_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

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
