import { Injectable } from '@nestjs/common';
import { CachedBrand, CachedBrandSet, IBrand } from '../interfaces';
import { MULTI_BRAND_CONSTANTS } from '../constants';

/**
 * MultiBrandCache
 *
 * Two partitioned in-memory caches, mirroring `TaxCache`/`RegionalSettingsCache`:
 *  1. Active-brand sets (by workspace)
 *  2. Individual brands (by workspace + code)
 *
 * Both are invalidated whenever a brand is created, updated, activated,
 * deactivated, archived or restored.
 */
@Injectable()
export class MultiBrandCache {
  private readonly brandSets = new Map<string, CachedBrandSet>();
  private readonly brands = new Map<string, CachedBrand>();

  // ── Active Brand Set Cache ────────────────────────────────

  static buildBrandSetKey(workspaceId: string): string {
    return `brandset:${workspaceId}`;
  }

  setBrandSet(workspaceId: string, brands: IBrand[]): void {
    this.evictIfFull(this.brandSets);
    this.brandSets.set(MultiBrandCache.buildBrandSetKey(workspaceId), { brands, cachedAt: Date.now() });
  }

  getBrandSet(workspaceId: string): IBrand[] | null {
    const entry = this.brandSets.get(MultiBrandCache.buildBrandSetKey(workspaceId));
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_BRAND_CONSTANTS.CACHE_TTL_MS) {
      this.brandSets.delete(MultiBrandCache.buildBrandSetKey(workspaceId));
      return null;
    }
    return entry.brands;
  }

  invalidateBrandSet(workspaceId: string): void {
    this.brandSets.delete(MultiBrandCache.buildBrandSetKey(workspaceId));
  }

  invalidateAllBrandSets(): void {
    this.brandSets.clear();
  }

  // ── Individual Brand Cache ────────────────────────────────

  static buildBrandKey(workspaceId: string, code: string): string {
    return `brand:${workspaceId}:${code.toUpperCase()}`;
  }

  setBrand(brand: IBrand): void {
    this.evictIfFull(this.brands);
    this.brands.set(MultiBrandCache.buildBrandKey(brand.workspaceId, brand.code), { brand, cachedAt: Date.now() });
  }

  getBrand(workspaceId: string, code: string): IBrand | null {
    const key = MultiBrandCache.buildBrandKey(workspaceId, code);
    const entry = this.brands.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_BRAND_CONSTANTS.CACHE_TTL_MS) {
      this.brands.delete(key);
      return null;
    }
    return entry.brand;
  }

  invalidateBrand(workspaceId: string, code: string): void {
    this.brands.delete(MultiBrandCache.buildBrandKey(workspaceId, code));
  }

  invalidateBrandsByWorkspace(workspaceId: string): void {
    const prefix = `brand:${workspaceId}:`;
    for (const k of this.brands.keys()) {
      if (k.startsWith(prefix)) this.brands.delete(k);
    }
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.brandSets.clear();
    this.brands.clear();
  }

  get brandSetSize(): number {
    return this.brandSets.size;
  }

  get brandSize(): number {
    return this.brands.size;
  }

  // ── LRU Eviction ───────────────────────────────────────────

  private evictIfFull(map: Map<string, { cachedAt: number }>): void {
    if (map.size < MULTI_BRAND_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...map.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(MULTI_BRAND_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      map.delete(entries[i][0]);
    }
  }
}
