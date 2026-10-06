import { Injectable, Logger } from '@nestjs/common';
import { IMarketplaceProviderConfig, CachedConfig } from '../interfaces';
import { MP_CONFIG_CONSTANTS } from '../constants';

/**
 * In-memory LRU-style cache for resolved marketplace provider configurations.
 * Keyed by workspace+provider+account+marketplace.
 * Cache entries expire after MP_CONFIG_CONSTANTS.CACHE_TTL_MS.
 */
@Injectable()
export class MarketplaceProviderConfigCache {
  private readonly logger = new Logger(MarketplaceProviderConfigCache.name);
  private readonly cache = new Map<string, CachedConfig>();

  set(
    key: string,
    config: IMarketplaceProviderConfig,
    ttlMs: number = MP_CONFIG_CONSTANTS.CACHE_TTL_MS,
  ): void {
    if (this.cache.size >= MP_CONFIG_CONSTANTS.CACHE_MAX_ENTRIES) {
      const oldest = this.cache.keys().next().value as string;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { config, cachedAt: new Date(), ttlMs });
  }

  get(key: string): IMarketplaceProviderConfig | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt.getTime() > entry.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.config;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
    this.logger.debug(`Cache invalidated: ${key}`);
  }

  invalidateByProvider(providerKey: string): void {
    const prefix = providerKey.toUpperCase();
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
    this.logger.debug(`Cache invalidated for provider: ${providerKey}`);
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(`:${workspaceId}:`)) {
        this.cache.delete(key);
      }
    }
    this.logger.debug(`Cache invalidated for workspace: ${workspaceId}`);
  }

  flush(): void {
    this.cache.clear();
    this.logger.debug('Cache flushed');
  }

  get size(): number {
    return this.cache.size;
  }

  static buildKey(
    providerKey: string,
    workspaceId?: string | null,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): string {
    return [
      providerKey.toUpperCase(),
      workspaceId ?? 'GLOBAL',
      accountId ?? 'DEFAULT',
      marketplaceKey ?? 'ANY',
    ].join(':');
  }
}
