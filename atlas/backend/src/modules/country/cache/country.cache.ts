import { Injectable } from '@nestjs/common';
import {
  CachedCountry,
  CachedCountryResolution,
  CountryResolutionResult,
  ICountry,
} from '../interfaces';
import { COUNTRY_CONSTANTS } from '../constants';

/**
 * CountryCache
 *
 * Two partitioned in-memory caches, mirroring the
 * `MarketplaceCapabilityCache` pattern:
 *  1. Country registry entries (by code)
 *  2. Resolved country contexts (by workspace + requested code)
 *
 * Both partitions are invalidated together whenever the underlying
 * registry, workspace enablement, or override data changes — this is the
 * "event-driven invalidation" the framework's write paths call into.
 */
@Injectable()
export class CountryCache {
  private readonly countries = new Map<string, CachedCountry>();
  private readonly resolutions = new Map<string, CachedCountryResolution>();

  // ── Country Cache ─────────────────────────────────────────

  static buildCountryKey(code: string): string {
    return `country:${code.toUpperCase()}`;
  }

  setCountry(country: ICountry): void {
    this.evictIfFull(this.countries, COUNTRY_CONSTANTS.CACHE_MAX_ENTRIES);
    this.countries.set(CountryCache.buildCountryKey(country.code), { country, cachedAt: Date.now() });
  }

  getCountry(code: string): ICountry | null {
    const key = CountryCache.buildCountryKey(code);
    const entry = this.countries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > COUNTRY_CONSTANTS.CACHE_TTL_MS) {
      this.countries.delete(key);
      return null;
    }
    return entry.country;
  }

  invalidateCountry(code: string): void {
    this.countries.delete(CountryCache.buildCountryKey(code));
    // a country's own data changing can affect any resolution that touched it
    const segment = `:${code.toUpperCase()}:`;
    for (const k of this.resolutions.keys()) {
      if (k.includes(segment)) this.resolutions.delete(k);
    }
  }

  // ── Resolution Cache ──────────────────────────────────────

  static buildResolutionKey(workspaceId: string, requestedCode?: string | null): string {
    return ['resolution', workspaceId, requestedCode?.toUpperCase() ?? 'default'].join(':');
  }

  setResolution(workspaceId: string, requestedCode: string | null | undefined, result: CountryResolutionResult): void {
    const key = CountryCache.buildResolutionKey(workspaceId, requestedCode);
    this.evictIfFull(this.resolutions, COUNTRY_CONSTANTS.RESOLUTION_CACHE_MAX);
    this.resolutions.set(key, { result, cachedAt: Date.now() });
  }

  getResolution(workspaceId: string, requestedCode?: string | null): CountryResolutionResult | null {
    const key = CountryCache.buildResolutionKey(workspaceId, requestedCode);
    const entry = this.resolutions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > COUNTRY_CONSTANTS.RESOLUTION_CACHE_TTL_MS) {
      this.resolutions.delete(key);
      return null;
    }
    return entry.result;
  }

  invalidateResolutionsByWorkspace(workspaceId: string): void {
    const prefix = `resolution:${workspaceId}:`;
    for (const k of this.resolutions.keys()) {
      if (k.startsWith(prefix)) this.resolutions.delete(k);
    }
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.countries.clear();
    this.resolutions.clear();
  }

  get countrySize(): number {
    return this.countries.size;
  }

  get resolutionSize(): number {
    return this.resolutions.size;
  }

  // ── LRU Eviction ───────────────────────────────────────────

  private evictIfFull(map: Map<string, { cachedAt: number }>, max: number): void {
    if (map.size < max) return;
    const entries = [...map.entries()].sort((a, b) => a[1].cachedAt - b[1].cachedAt);
    const evictCount = Math.ceil(max * 0.1);
    for (let i = 0; i < evictCount; i++) {
      map.delete(entries[i][0]);
    }
  }
}
