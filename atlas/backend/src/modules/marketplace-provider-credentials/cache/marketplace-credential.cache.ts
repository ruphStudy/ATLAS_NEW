import { Injectable, Optional } from '@nestjs/common';
import { IMarketplaceProviderCredential } from '../interfaces';
import { MP_CREDENTIAL_CONSTANTS } from '../constants';

interface CacheEntry {
  credential: IMarketplaceProviderCredential;
  expiresAt: number;
}

/**
 * Secure in-memory credential cache with TTL and LRU eviction.
 *
 * Cache entries hold the DB record (still encrypted).
 * Decrypted values are NEVER stored in cache.
 */
@Injectable()
export class MarketplaceCredentialCache {
  private readonly store = new Map<string, CacheEntry>();
  private readonly maxEntries: number;

  constructor(@Optional() maxEntries: number = MP_CREDENTIAL_CONSTANTS.CACHE_MAX_ENTRIES) {
    this.maxEntries = maxEntries;
  }

  static buildKey(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): string {
    const parts = [providerKey, workspaceId];
    if (accountId) parts.push(accountId);
    if (marketplaceKey) parts.push(marketplaceKey);
    return parts.join(':');
  }

  set(
    key: string,
    credential: IMarketplaceProviderCredential,
    ttlMs: number = MP_CREDENTIAL_CONSTANTS.CACHE_TTL_MS,
  ): void {
    if (this.store.size >= this.maxEntries) {
      // Evict oldest entry
      const oldestKey = this.store.keys().next().value;
      if (oldestKey !== undefined) this.store.delete(oldestKey);
    }
    this.store.set(key, { credential, expiresAt: Date.now() + ttlMs });
  }

  get(key: string): IMarketplaceProviderCredential | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.credential;
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  invalidateByProvider(providerKey: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(`${providerKey}:`)) {
        this.store.delete(key);
      }
    }
  }

  invalidateByWorkspace(workspaceId: string): void {
    for (const key of this.store.keys()) {
      if (key.includes(`:${workspaceId}`) || key.startsWith(`${workspaceId}:`)) {
        this.store.delete(key);
      }
    }
  }

  invalidateById(credentialId: string): void {
    for (const [key, entry] of this.store.entries()) {
      if (entry.credential.id === credentialId) {
        this.store.delete(key);
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
