import { Injectable } from '@nestjs/common';
import { CachedExpansion, ISupplierProviderExpansion } from '../interfaces';
import { SUPPLIER_PROVIDER_EXPANSION_CONSTANTS } from '../constants';

/**
 * SupplierProviderExpansionCache
 *
 * A single partition of resolved expansion records (by providerCode +
 * workspace), mirroring `MarketplaceExpansionCache`/`MultiChannelCache`.
 * Invalidated whenever an expansion is onboarded, updated, promoted/
 * demoted, or its adapter compatibility is re-validated.
 */
@Injectable()
export class SupplierProviderExpansionCache {
  private readonly expansions = new Map<string, CachedExpansion>();

  static buildKey(providerCode: string, workspaceId?: string | null): string {
    return `expansion:${providerCode.toUpperCase()}:${workspaceId ?? 'global'}`;
  }

  set(expansion: ISupplierProviderExpansion): void {
    this.evictIfFull();
    this.expansions.set(SupplierProviderExpansionCache.buildKey(expansion.providerCode, expansion.workspaceId), {
      expansion,
      cachedAt: Date.now(),
    });
  }

  get(providerCode: string, workspaceId?: string | null): ISupplierProviderExpansion | null {
    const key = SupplierProviderExpansionCache.buildKey(providerCode, workspaceId);
    const entry = this.expansions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.CACHE_TTL_MS) {
      this.expansions.delete(key);
      return null;
    }
    return entry.expansion;
  }

  invalidate(providerCode: string, workspaceId?: string | null): void {
    this.expansions.delete(SupplierProviderExpansionCache.buildKey(providerCode, workspaceId));
  }

  invalidateByProvider(providerCode: string): void {
    const prefix = `expansion:${providerCode.toUpperCase()}:`;
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
    if (this.expansions.size < SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...this.expansions.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(SUPPLIER_PROVIDER_EXPANSION_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      this.expansions.delete(entries[i][0]);
    }
  }
}
