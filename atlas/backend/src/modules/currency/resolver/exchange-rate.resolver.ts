import { Injectable, NotFoundException } from '@nestjs/common';
import { CurrencyCache } from '../cache/currency.cache';
import { CurrencyRepository } from '../repository/currency.repository';
import { CURRENCY_CONSTANTS } from '../constants';
import { ConversionDirection, IExchangeRate, RateResolutionRequest, RateResolutionResult } from '../interfaces';

/**
 * ExchangeRateResolver
 *
 * Resolves the effective rate for a base/quote currency pair — trying a
 * stored direct rate, then the inverse of a stored reverse rate, then a
 * cross-rate through a pivot currency. Mirrors `MarketplaceCapabilityResolver`
 * / `CountryContextResolver`'s cache-then-compute structure. Never invents
 * or hardcodes a rate value — every result traces back to a stored
 * `ExchangeRate` row.
 */
@Injectable()
export class ExchangeRateResolver {
  constructor(
    private readonly cache: CurrencyCache,
    private readonly repository: CurrencyRepository,
  ) {}

  async resolve(request: RateResolutionRequest): Promise<RateResolutionResult> {
    const base = request.baseCurrency.toUpperCase();
    const quote = request.quoteCurrency.toUpperCase();

    if (base === quote) {
      return {
        rate: 1,
        direction: ConversionDirection.IDENTITY,
        effectiveAt: request.asOfDate ?? new Date(),
        fetchedAt: new Date(),
        source: 'IDENTITY',
        stale: false,
        ageMinutes: 0,
      };
    }

    const cacheKey = CurrencyCache.buildRateKey(base, quote, request.asOfDate, request.workspaceId);
    const cached = this.cache.getRate(cacheKey);
    if (cached) return cached;

    const result = await this.doResolve(base, quote, request.asOfDate ?? null, request.workspaceId);
    this.cache.setRate(cacheKey, result);
    return result;
  }

  private async doResolve(
    base: string,
    quote: string,
    asOfDate: Date | null,
    workspaceId?: string | null,
  ): Promise<RateResolutionResult> {
    const effectiveDate = asOfDate ?? new Date();
    const workspaceConfig = workspaceId ? await this.repository.findWorkspaceConfig(workspaceId) : null;
    const toleranceMinutes =
      (workspaceConfig as { staleToleranceMinutes?: number } | null)?.staleToleranceMinutes ??
      CURRENCY_CONSTANTS.DEFAULT_STALE_TOLERANCE_MINUTES;

    // 1. Direct rate
    const direct = await this.repository.findEffectiveRate(base, quote, effectiveDate, workspaceId);
    if (direct) {
      const raw = direct as unknown as IExchangeRate;
      return this.buildResult(raw.rate, ConversionDirection.DIRECT, raw, effectiveDate, toleranceMinutes);
    }

    // 2. Inverse of a stored reverse rate
    const inverse = await this.repository.findEffectiveRate(quote, base, effectiveDate, workspaceId);
    if (inverse) {
      const raw = inverse as unknown as IExchangeRate;
      return this.buildResult(1 / raw.rate, ConversionDirection.INVERSE, raw, effectiveDate, toleranceMinutes);
    }

    // 3. Cross-rate through a pivot currency
    const pivots = [
      (workspaceConfig as { baseCurrency?: string } | null)?.baseCurrency,
      ...CURRENCY_CONSTANTS.DEFAULT_PIVOT_CURRENCIES,
    ].filter((p): p is string => !!p && p.toUpperCase() !== base && p.toUpperCase() !== quote);

    for (const pivot of [...new Set(pivots.map((p) => p.toUpperCase()))]) {
      const fromPivot = await this.repository.findEffectiveRate(base, pivot, effectiveDate, workspaceId);
      const toPivot = await this.repository.findEffectiveRate(quote, pivot, effectiveDate, workspaceId);
      if (fromPivot && toPivot) {
        const fromRaw = fromPivot as unknown as IExchangeRate;
        const toRaw = toPivot as unknown as IExchangeRate;
        const rate = fromRaw.rate / toRaw.rate;
        // Use the older (more conservative) of the two legs for staleness/effective metadata.
        const older = fromRaw.fetchedAt <= toRaw.fetchedAt ? fromRaw : toRaw;
        return this.buildResult(rate, ConversionDirection.CROSS, older, effectiveDate, toleranceMinutes);
      }
    }

    throw new NotFoundException(`No exchange rate available for '${base}' → '${quote}'`);
  }

  private buildResult(
    rate: number,
    direction: ConversionDirection,
    raw: IExchangeRate,
    effectiveDate: Date,
    toleranceMinutes: number,
  ): RateResolutionResult {
    const ageMinutes = Math.max(0, (effectiveDate.getTime() - new Date(raw.fetchedAt).getTime()) / 60_000);
    return {
      rate,
      direction,
      effectiveAt: new Date(raw.effectiveAt),
      fetchedAt: new Date(raw.fetchedAt),
      source: raw.source,
      stale: ageMinutes > toleranceMinutes,
      ageMinutes,
    };
  }
}
