import { Injectable } from '@nestjs/common';
import { CachedTaxCalculation, CachedTaxRuleSet, ITaxRule, TaxCalculationResult } from '../interfaces';
import { TAX_CONSTANTS } from '../constants';

/**
 * TaxCache
 *
 * Two partitioned in-memory caches, mirroring `CurrencyCache`:
 *  1. Resolved effective rule sets (by jurisdiction + tax type + workspace + effective-date bucket)
 *  2. Calculation results (by a composite request key)
 *
 * Both are invalidated whenever the underlying rules, overrides, or
 * jurisdictions change — the "event-driven invalidation" the framework's
 * write paths call into.
 */
@Injectable()
export class TaxCache {
  private readonly ruleSets = new Map<string, CachedTaxRuleSet>();
  private readonly calculations = new Map<string, CachedTaxCalculation>();

  // ── Rule Set Cache ────────────────────────────────────────

  static buildRuleSetKey(
    jurisdictionCode: string,
    taxType: string | null | undefined,
    workspaceId: string | null | undefined,
    effectiveDate: Date,
  ): string {
    return [
      'ruleset',
      jurisdictionCode.toUpperCase(),
      taxType ?? 'any',
      workspaceId ?? 'global',
      Math.floor(effectiveDate.getTime() / 60_000), // minute bucket
    ].join(':');
  }

  setRuleSet(key: string, rules: ITaxRule[]): void {
    this.evictIfFull(this.ruleSets, TAX_CONSTANTS.CACHE_MAX_ENTRIES);
    this.ruleSets.set(key, { rules, cachedAt: Date.now() });
  }

  getRuleSet(key: string): ITaxRule[] | null {
    const entry = this.ruleSets.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TAX_CONSTANTS.CACHE_TTL_MS) {
      this.ruleSets.delete(key);
      return null;
    }
    return entry.rules;
  }

  invalidateRuleSetsByJurisdiction(jurisdictionCode: string): void {
    const segment = `:${jurisdictionCode.toUpperCase()}:`;
    for (const k of this.ruleSets.keys()) {
      if (k.includes(segment)) this.ruleSets.delete(k);
    }
  }

  invalidateRuleSetsByWorkspace(workspaceId: string): void {
    const segment = `:${workspaceId}:`;
    for (const k of this.ruleSets.keys()) {
      if (k.includes(segment)) this.ruleSets.delete(k);
    }
  }

  invalidateAllRuleSets(): void {
    this.ruleSets.clear();
  }

  // ── Calculation Cache ─────────────────────────────────────

  static buildCalculationKey(
    workspaceId: string,
    jurisdictionCode: string,
    taxType: string | null | undefined,
    taxableBase: number,
    effectiveDate: Date,
  ): string {
    return [
      'calc',
      workspaceId,
      jurisdictionCode.toUpperCase(),
      taxType ?? 'any',
      taxableBase,
      Math.floor(effectiveDate.getTime() / 60_000),
    ].join(':');
  }

  setCalculation(key: string, result: TaxCalculationResult): void {
    this.evictIfFull(this.calculations, TAX_CONSTANTS.CALCULATION_CACHE_MAX);
    this.calculations.set(key, { result, cachedAt: Date.now() });
  }

  getCalculation(key: string): TaxCalculationResult | null {
    const entry = this.calculations.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt > TAX_CONSTANTS.CALCULATION_CACHE_TTL_MS) {
      this.calculations.delete(key);
      return null;
    }
    return entry.result;
  }

  invalidateCalculationsByWorkspace(workspaceId: string): void {
    const prefix = `calc:${workspaceId}:`;
    for (const k of this.calculations.keys()) {
      if (k.startsWith(prefix)) this.calculations.delete(k);
    }
  }

  // ── Bulk Operations ───────────────────────────────────────

  flush(): void {
    this.ruleSets.clear();
    this.calculations.clear();
  }

  get ruleSetSize(): number {
    return this.ruleSets.size;
  }

  get calculationSize(): number {
    return this.calculations.size;
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
