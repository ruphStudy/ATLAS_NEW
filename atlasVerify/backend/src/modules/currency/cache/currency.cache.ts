import { Injectable } from '@nestjs/common';
import { CachedCurrency, CachedRateResolution, ICurrency, RateResolutionResult } from '../interfaces';
import { CURRENCY_CONSTANTS } from '../constants';

/**
 * CurrencyCache
 *
 * Two partitioned in-memory caches, mirroring `CountryCache`:
 *  1. Currency registry entries (by code)
 *  2. Resolved exchange-rate lookups (by base + quote + workspace + as-of-date bucket)
 *
 * Both are invalidated whenever the underlying currency, workspace config,
 * or rate data changes.
 */
@Injectable()
export class CurrencyCache {
  private readonly currencies = new Map<string, CachedCurrency>();
  private readonly rates = new Map<string, CachedRateResolution>();

  // ── Currency Cache ────────────────────────────────────────

  static buildCurrencyKey(code: string): string {
    return `currency:${code.toUpperCase()}`;
  }

  setCurrency(currency: ICurrency): void {
    this.evictIfFull(this.currencies, CURRENCY_CONSTANTS.CACHE_MAX_ENTRIES);
    this.currencies.set(CurrencyCache.buildCurrencyKey(currency.code), { currency, cachedAt: Date.now() });
  }

  getCurrency(code: string): ICurrency | null {
    const key = CurrencyCache.buildCurrencyKey(code);
    const entry = this.currencies.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CURRENCY_CONSTANTS.CACHE_TTL_MS) {
      this.currencies.delete(key);
      return null;
    }
    return entry.currency;
  }

  invalidateCurrency(code: string): void {
    this.currencies.delete(CurrencyCache.buildCurrencyKey(code));
    const segment = `:${code.toUpperCase()}:`;
    for (const k of this.rates.keys()) {
      if (k.includes(segment)) this.rates.delete(k);
    }
  }

  // ── Rate Resolution Cache ──────────────────────────────────

  /** `asOfDate` is bucketed to the minute — current-rate look-ups (no asOfDate) use 'current', which the short TTL keeps fresh. */
  static buildRateKey(
    baseCurrency: string,
    quoteCurrency: string,
    asOfDate: Date | null | undefined,
    workspaceId?: string | null,
  ): string {
    return [
      'rate',
      baseCurrency.toUpperCase(),
      quoteCurrency.toUpperCase(),
      asOfDate ? Math.floor(asOfDate.getTime() / 60_000) : 'current',
      workspaceId ?? 'global',
    ].join(':');
  }

  setRate(key: string, result: RateResolutionResult): void {
    this.evictIfFull(this.rates, CURRENCY_CONSTANTS.RATE_CACHE_MAX);
    this.rates.set(key, { result, cachedAt: Date.now() });
  }

  getRate(key: string): RateResolutionResult | null {
    const entry = this.rates.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > CURRENCY_CONSTANTS.RATE_CACHE_TTL_MS) {
      this.rates.delete(key);
      return null;
    }
    return entry.result;
  }

  invalidateRatesByWorkspace(workspaceId: string): void {
    const segment = `:${workspaceId}`;
    for (const k of this.rates.keys()) {
      if (k.endsWith(segment)) this.rates.delete(k);
    }
  }

  invalidateAllRates(): void {
    this.rates.clear();
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.currencies.clear();
    this.rates.clear();
  }

  get currencySize(): number {
    return this.currencies.size;
  }

  get rateSize(): number {
    return this.rates.size;
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
