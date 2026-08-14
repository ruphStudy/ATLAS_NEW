import { BadRequestException, Injectable } from '@nestjs/common';
import { CurrencyRegistry } from '../registry/currency.registry';
import { ExchangeRateResolver } from '../resolver/exchange-rate.resolver';
import { roundMoney } from './money-rounding.util';
import { CURRENCY_CONSTANTS, CURRENCY_ERROR_CODES } from '../constants';
import { ConversionRequest, ConversionResult, RoundingMode } from '../interfaces';

/**
 * CurrencyConverter
 *
 * Performs the actual monetary conversion: resolves the effective rate via
 * `ExchangeRateResolver`, then applies the target currency's configured
 * decimals/rounding mode. Never computes or stores rates itself.
 */
@Injectable()
export class CurrencyConverter {
  constructor(
    private readonly registry: CurrencyRegistry,
    private readonly resolver: ExchangeRateResolver,
  ) {}

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const fromCurrency = request.fromCurrency.toUpperCase();
    const toCurrency = request.toCurrency.toUpperCase();

    const rateResult = await this.resolver.resolve({
      baseCurrency: fromCurrency,
      quoteCurrency: toCurrency,
      asOfDate: request.asOfDate ?? null,
      workspaceId: request.workspaceId,
    });

    // Staleness only matters for a "give me the current rate" request — a
    // deliberately backdated (asOfDate) or identity conversion is exempt.
    if (rateResult.stale && !request.asOfDate && !request.allowStale) {
      throw new BadRequestException({
        message: `Exchange rate for '${fromCurrency}' → '${toCurrency}' is stale (${Math.round(rateResult.ageMinutes)}m old) — refresh the rate or pass allowStale`,
        code: CURRENCY_ERROR_CODES.STALE_RATE,
      });
    }

    const targetCurrency = this.registry.get(toCurrency);
    const decimals = targetCurrency?.decimals ?? CURRENCY_CONSTANTS.DEFAULT_DECIMALS;
    const roundingMode = targetCurrency?.roundingMode ?? (CURRENCY_CONSTANTS.DEFAULT_ROUNDING_MODE as RoundingMode);

    const convertedAmount = roundMoney(request.amount * rateResult.rate, decimals, roundingMode);

    return {
      originalAmount: request.amount,
      originalCurrency: fromCurrency,
      convertedAmount,
      convertedCurrency: toCurrency,
      rate: rateResult.rate,
      rateDirection: rateResult.direction,
      rateEffectiveAt: rateResult.effectiveAt,
      rateSource: rateResult.source,
      stale: rateResult.stale,
      conversionTimestamp: new Date(),
    };
  }
}
