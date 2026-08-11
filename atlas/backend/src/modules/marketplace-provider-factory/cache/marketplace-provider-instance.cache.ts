import { Injectable } from '@nestjs/common';
import { ProviderInstance, ProviderInstanceCacheEntry, ProviderInstanceState } from '../interfaces';
import { MP_FACTORY_CONSTANTS } from '../constants';

/**
 * In-memory cache for resolved provider instances.
 *
 * Cache key encodes all context that, when changed, must produce a new instance:
 * workspace, provider, account, country, region, api-version, config-version, credential-version.
 *
 * Entries are automatically evicted when:
 *   - TTL expires
 *   - Instance state becomes unusable
 *   - Configuration or credential version changes
 */
@Injectable()
export class MarketplaceProviderInstanceCache {
  private readonly store = new Map<string, ProviderInstanceCacheEntry>();
  private readonly maxEntries: number;

  constructor(maxEntries = MP_FACTORY_CONSTANTS.INSTANCE_CACHE_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  static buildKey(
    workspaceId: string,
    providerKey: string,
    accountId?: string | null,
    country?: string | null,
    region?: string | null,
    apiVersion?: string | null,
    configVersion?: number | null,
    credentialVersion?: number | null,
  ): string {
    return [
      workspaceId,
      providerKey.toUpperCase(),
      accountId ?? '_',
      country ?? '_',
      region ?? '_',
      apiVersion ?? '_',
      configVersion != null ? String(configVersion) : '_',
      credentialVersion != null ? String(credentialVersion) : '_',
    ].join(':');
  }

  set(
    key: string,
    instance: ProviderInstance,
    ttlMs: number = MP_FACTORY_CONSTANTS.INSTANCE_CACHE_TTL_MS,
  ): void {
    if (this.store.size >= this.maxEntries) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, {
      instance,
      cachedAt: new Date(),
      ttlMs,
    });
  }

  get(key: string): ProviderInstance | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // TTL check
    if (Date.now() > entry.cachedAt.getTime() + entry.ttlMs) {
      this.store.delete(key);
      return null;
    }

    // State check — do not return unusable instances
    if (MP_FACTORY_CONSTANTS.UNUSABLE_STATES.has(entry.instance.state)) {
      this.store.delete(key);
      return null;
    }

    return entry.instance;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${workspaceId}:`)) {
        this.store.delete(key);
      }
    }
  }

  invalidateByProvider(providerKey: string): void {
    const upper = providerKey.toUpperCase();
    for (const key of this.store.keys()) {
      const parts = key.split(':');
      if (parts[1] === upper) {
        this.store.delete(key);
      }
    }
  }

  invalidateByAccount(workspaceId: string, accountId: string): void {
    for (const key of this.store.keys()) {
      const parts = key.split(':');
      if (parts[0] === workspaceId && parts[2] === accountId) {
        this.store.delete(key);
      }
    }
  }

  invalidateByInstanceId(instanceId: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.instance.instanceId === instanceId) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Updates the state of a cached instance in-place.
   * Removes the entry if state becomes unusable.
   */
  updateState(instanceId: string, state: ProviderInstanceState): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.instance.instanceId === instanceId) {
        if (MP_FACTORY_CONSTANTS.UNUSABLE_STATES.has(state)) {
          this.store.delete(key);
        } else {
          entry.instance.state = state;
        }
        return;
      }
    }
  }

  flush(): void {
    this.store.clear();
  }

  size(): number {
    return this.store.size;
  }
}
