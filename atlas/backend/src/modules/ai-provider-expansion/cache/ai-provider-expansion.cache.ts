import { Injectable } from '@nestjs/common';
import { IAiProviderExpansion, ICachedAiProviderExpansion } from '../interfaces';
import { AI_PROVIDER_EXPANSION_CONSTANTS } from '../constants';

/**
 * AiProviderExpansionCache
 *
 * A single partition of resolved expansion records (by providerKey +
 * workspace), mirroring `AiProviderRegistryCache`/`ShippingProviderExpansionCache`.
 * Invalidated whenever an expansion is onboarded, updated, promoted/
 * demoted, or its adapter compatibility is re-validated.
 */
@Injectable()
export class AiProviderExpansionCache {
  private readonly cache = new Map<string, ICachedAiProviderExpansion>();

  static buildKey(providerKey: string, workspaceId?: string | null): string {
    return `expansion:${providerKey.toUpperCase()}:${workspaceId ?? 'global'}`;
  }

  set(expansion: IAiProviderExpansion): void {
    this.evictIfFull();
    this.cache.set(AiProviderExpansionCache.buildKey(expansion.providerKey, expansion.workspaceId), {
      expansion,
      cachedAt: new Date(),
    });
  }

  get(providerKey: string, workspaceId?: string | null): IAiProviderExpansion | null {
    const key = AiProviderExpansionCache.buildKey(providerKey, workspaceId);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt.getTime() > AI_PROVIDER_EXPANSION_CONSTANTS.CACHE_TTL_MS) {
      this.cache.delete(key);
      return null;
    }
    return entry.expansion;
  }

  invalidate(providerKey: string, workspaceId?: string | null): void {
    this.cache.delete(AiProviderExpansionCache.buildKey(providerKey, workspaceId));
  }

  invalidateByProvider(providerKey: string): void {
    const prefix = `expansion:${providerKey.toUpperCase()}:`;
    for (const k of this.cache.keys()) {
      if (k.startsWith(prefix)) this.cache.delete(k);
    }
  }

  flush(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  private evictIfFull(): void {
    if (this.cache.size < AI_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...this.cache.entries()].sort((a, b) => a[1].cachedAt.getTime() - b[1].cachedAt.getTime());
    const evictCount = Math.ceil(AI_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}
