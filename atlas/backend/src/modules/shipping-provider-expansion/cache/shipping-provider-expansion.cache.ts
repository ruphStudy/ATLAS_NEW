import { Injectable } from '@nestjs/common';
import { CachedExpansion, IShippingProviderExpansion } from '../interfaces';
import { SHIPPING_PROVIDER_EXPANSION_CONSTANTS } from '../constants';

/**
 * ShippingProviderExpansionCache
 *
 * A single partition of resolved expansion records (by providerKey +
 * workspace), mirroring `SupplierProviderExpansionCache`/
 * `MarketplaceExpansionCache`. Invalidated whenever an expansion is
 * onboarded, updated, promoted/demoted, or its adapter compatibility is
 * re-validated.
 */
@Injectable()
export class ShippingProviderExpansionCache {
  private readonly expansions = new Map<string, CachedExpansion>();

  static buildKey(providerKey: string, workspaceId?: string | null): string {
    return `expansion:${providerKey.toUpperCase()}:${workspaceId ?? 'global'}`;
  }

  set(expansion: IShippingProviderExpansion): void {
    this.evictIfFull();
    this.expansions.set(ShippingProviderExpansionCache.buildKey(expansion.providerKey, expansion.workspaceId), {
      expansion,
      cachedAt: Date.now(),
    });
  }

  get(providerKey: string, workspaceId?: string | null): IShippingProviderExpansion | null {
    const key = ShippingProviderExpansionCache.buildKey(providerKey, workspaceId);
    const entry = this.expansions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > SHIPPING_PROVIDER_EXPANSION_CONSTANTS.CACHE_TTL_MS) {
      this.expansions.delete(key);
      return null;
    }
    return entry.expansion;
  }

  invalidate(providerKey: string, workspaceId?: string | null): void {
    this.expansions.delete(ShippingProviderExpansionCache.buildKey(providerKey, workspaceId));
  }

  invalidateByProvider(providerKey: string): void {
    const prefix = `expansion:${providerKey.toUpperCase()}:`;
    for (const k of this.expansions.keys()) {
      if (k.startsWith(prefix)) this.expansions.delete(k);
    }
  }

  flush(): void {
    this.expansions.clear();
  }

  get size(): number {
    return this.expansions.size;
  }

  private evictIfFull(): void {
    if (this.expansions.size < SHIPPING_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...this.expansions.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(SHIPPING_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      this.expansions.delete(entries[i][0]);
    }
  }
}
