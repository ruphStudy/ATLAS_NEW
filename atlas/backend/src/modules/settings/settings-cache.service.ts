import { Injectable, Logger } from '@nestjs/common';
import { SETTINGS_CACHE_TTL_MS } from './constants';

interface ICacheEntry {
  value: unknown;
  expiresAt: number;
}

/**
 * SettingsCacheService — in-process cache of resolved settings, keyed by
 * `${workspaceId}:${moduleKey}:${userId}:${definitionKey}`. Shared as a
 * singleton between `SettingsService` (populates on resolve, invalidates
 * synchronously on write) and `SettingsEventWorker` (invalidates when a
 * change event is consumed) — the event-driven half of "cache resolved
 * settings with event-driven invalidation".
 */
@Injectable()
export class SettingsCacheService {
  private readonly logger = new Logger(SettingsCacheService.name);
  private readonly store = new Map<string, ICacheEntry>();

  buildKey(workspaceId: string, moduleKey: string | undefined, userId: string | undefined, definitionKey: string): string {
    return `${workspaceId}:${moduleKey ?? '-'}:${userId ?? '-'}:${definitionKey}`;
  }

  get(key: string): unknown | undefined {
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

  set(key: string, value: unknown, ttlMs: number = SETTINGS_CACHE_TTL_MS): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }

  /** Invalidates every cached entry — used for GLOBAL/ORGANIZATION scope writes, which can affect any workspace. */
  invalidateAll(): void {
    this.store.clear();
  }

  /** Invalidates every cached entry for a workspace (any module/user) — used for WORKSPACE scope writes. */
  invalidateWorkspace(workspaceId: string): void {
    this.invalidateByPredicate((key) => key.startsWith(`${workspaceId}:`));
  }

  /** Invalidates cached entries for a specific workspace+module — used for MODULE scope writes. */
  invalidateModule(workspaceId: string, moduleKey: string): void {
    this.invalidateByPredicate((key) => key.startsWith(`${workspaceId}:${moduleKey}:`));
  }

  /** Invalidates cached entries for a specific workspace+user — used for USER scope writes. */
  invalidateUser(workspaceId: string, userId: string): void {
    this.invalidateByPredicate((key) => key.startsWith(`${workspaceId}:`) && key.includes(`:${userId}:`));
  }

  private invalidateByPredicate(predicate: (key: string) => boolean): void {
    for (const key of this.store.keys()) {
      if (predicate(key)) {
        this.store.delete(key);
      }
    }
  }
}
