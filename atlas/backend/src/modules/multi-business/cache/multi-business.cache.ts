import { Injectable } from '@nestjs/common';
import { CachedBusiness, CachedBusinessSet, IBusiness } from '../interfaces';
import { MULTI_BUSINESS_CONSTANTS } from '../constants';

/**
 * MultiBusinessCache
 *
 * Two partitioned in-memory caches, mirroring `MultiBrandCache`/`TaxCache`:
 *  1. Business sets (by workspace)
 *  2. Individual businesses (by workspace + code)
 *
 * Both are invalidated whenever a business is created, updated, activated,
 * suspended, archived or restored.
 */
@Injectable()
export class MultiBusinessCache {
  private readonly businessSets = new Map<string, CachedBusinessSet>();
  private readonly businesses = new Map<string, CachedBusiness>();

  // ── Business Set Cache ────────────────────────────────────

  static buildBusinessSetKey(workspaceId: string): string {
    return `businessset:${workspaceId}`;
  }

  setBusinessSet(workspaceId: string, businesses: IBusiness[]): void {
    this.evictIfFull(this.businessSets);
    this.businessSets.set(MultiBusinessCache.buildBusinessSetKey(workspaceId), { businesses, cachedAt: Date.now() });
  }

  getBusinessSet(workspaceId: string): IBusiness[] | null {
    const key = MultiBusinessCache.buildBusinessSetKey(workspaceId);
    const entry = this.businessSets.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_BUSINESS_CONSTANTS.CACHE_TTL_MS) {
      this.businessSets.delete(key);
      return null;
    }
    return entry.businesses;
  }

  invalidateBusinessSet(workspaceId: string): void {
    this.businessSets.delete(MultiBusinessCache.buildBusinessSetKey(workspaceId));
  }

  invalidateAllBusinessSets(): void {
    this.businessSets.clear();
  }

  // ── Individual Business Cache ─────────────────────────────

  static buildBusinessKey(workspaceId: string, code: string): string {
    return `business:${workspaceId}:${code.toUpperCase()}`;
  }

  setBusiness(business: IBusiness): void {
    this.evictIfFull(this.businesses);
    this.businesses.set(MultiBusinessCache.buildBusinessKey(business.workspaceId, business.code), { business, cachedAt: Date.now() });
  }

  getBusiness(workspaceId: string, code: string): IBusiness | null {
    const key = MultiBusinessCache.buildBusinessKey(workspaceId, code);
    const entry = this.businesses.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > MULTI_BUSINESS_CONSTANTS.CACHE_TTL_MS) {
      this.businesses.delete(key);
      return null;
    }
    return entry.business;
  }

  invalidateBusiness(workspaceId: string, code: string): void {
    this.businesses.delete(MultiBusinessCache.buildBusinessKey(workspaceId, code));
  }

  invalidateBusinessesByWorkspace(workspaceId: string): void {
    const prefix = `business:${workspaceId}:`;
    for (const k of this.businesses.keys()) {
      if (k.startsWith(prefix)) this.businesses.delete(k);
    }
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.businessSets.clear();
    this.businesses.clear();
  }

  get businessSetSize(): number {
    return this.businessSets.size;
  }

  get businessSize(): number {
    return this.businesses.size;
  }

  // ── LRU Eviction ───────────────────────────────────────────

  private evictIfFull(map: Map<string, { cachedAt: number }>): void {
    if (map.size < MULTI_BUSINESS_CONSTANTS.CACHE_MAX_ENTRIES) return;
    const entries = [...map.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(MULTI_BUSINESS_CONSTANTS.CACHE_MAX_ENTRIES * 0.1);
    for (let i = 0; i < evictCount; i++) {
      map.delete(entries[i][0]);
    }
  }
}
