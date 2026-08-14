import { Injectable } from '@nestjs/common';
import { CachedEffectiveRegionalSettings, CachedRegionalProfileSet, IEffectiveRegionalSettings, IRegionalSettingsProfile } from '../interfaces';
import { REGIONAL_SETTINGS_CONSTANTS } from '../constants';

/**
 * RegionalSettingsCache
 *
 * Two partitioned in-memory caches, mirroring `TaxCache`/`CurrencyCache`:
 *  1. Applicable profile sets (by workspace + country + region + effective-date bucket)
 *  2. Merged effective-settings resolutions (by the same composite key)
 *
 * Both are invalidated whenever a profile is created, updated, published,
 * archived or rolled back — the event-driven-invalidation write paths call
 * into these directly.
 */
@Injectable()
export class RegionalSettingsCache {
  private readonly profileSets = new Map<string, CachedRegionalProfileSet>();
  private readonly resolutions = new Map<string, CachedEffectiveRegionalSettings>();

  // ── Profile Set Cache ─────────────────────────────────────

  static buildProfileSetKey(
    workspaceId: string,
    countryCode: string | null | undefined,
    regionCode: string | null | undefined,
    effectiveDate: Date,
  ): string {
    return [
      'profiles',
      workspaceId,
      countryCode ?? 'any',
      regionCode ?? 'any',
      Math.floor(effectiveDate.getTime() / 60_000), // minute bucket
    ].join(':');
  }

  setProfileSet(key: string, profiles: IRegionalSettingsProfile[]): void {
    this.evictIfFull(this.profileSets, REGIONAL_SETTINGS_CONSTANTS.CACHE_MAX_ENTRIES);
    this.profileSets.set(key, { profiles, cachedAt: Date.now() });
  }

  getProfileSet(key: string): IRegionalSettingsProfile[] | null {
    const entry = this.profileSets.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > REGIONAL_SETTINGS_CONSTANTS.PROFILE_CACHE_TTL_MS) {
      this.profileSets.delete(key);
      return null;
    }
    return entry.profiles;
  }

  invalidateProfileSetsByWorkspace(workspaceId: string): void {
    const segment = `:${workspaceId}:`;
    for (const k of this.profileSets.keys()) {
      if (k.includes(segment)) this.profileSets.delete(k);
    }
  }

  invalidateAllProfileSets(): void {
    this.profileSets.clear();
  }

  // ── Resolution Cache ──────────────────────────────────────

  static buildResolutionKey(
    workspaceId: string,
    countryCode: string | null | undefined,
    regionCode: string | null | undefined,
    effectiveDate: Date,
  ): string {
    return [
      'resolved',
      workspaceId,
      countryCode ?? 'any',
      regionCode ?? 'any',
      Math.floor(effectiveDate.getTime() / 60_000),
    ].join(':');
  }

  setResolution(key: string, result: IEffectiveRegionalSettings): void {
    this.evictIfFull(this.resolutions, REGIONAL_SETTINGS_CONSTANTS.RESOLUTION_CACHE_MAX);
    this.resolutions.set(key, { result, cachedAt: Date.now() });
  }

  getResolution(key: string): IEffectiveRegionalSettings | null {
    const entry = this.resolutions.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > REGIONAL_SETTINGS_CONSTANTS.RESOLUTION_CACHE_TTL_MS) {
      this.resolutions.delete(key);
      return null;
    }
    return entry.result;
  }

  invalidateResolutionsByWorkspace(workspaceId: string): void {
    const prefix = `resolved:${workspaceId}:`;
    for (const k of this.resolutions.keys()) {
      if (k.startsWith(prefix)) this.resolutions.delete(k);
    }
  }

  invalidateAllResolutions(): void {
    this.resolutions.clear();
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.profileSets.clear();
    this.resolutions.clear();
  }

  get profileSetSize(): number {
    return this.profileSets.size;
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
