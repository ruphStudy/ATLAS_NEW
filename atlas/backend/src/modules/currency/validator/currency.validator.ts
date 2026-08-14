import { Injectable } from '@nestjs/common';
import { CurrencyRepository } from '../repository/currency.repository';
import { CurrencyRegistry } from '../registry/currency.registry';
import {
  CurrencyValidationIssueType,
  CurrencyValidationResult,
  IExchangeRate,
  RecordRateRequest,
} from '../interfaces';
import { CURRENCY_CONSTANTS } from '../constants';

/**
 * CurrencyValidator
 *
 * Validates a rate before it is persisted: rejects non-positive/invalid
 * values, self-pairs, and exact duplicates (same base/quote/source/
 * effective timestamp/workspace scope) — the "prevent duplicate or invalid
 * rates" requirement — and flags (without rejecting) a rate that deviates
 * abnormally from the last published rate for the same pair. Staleness is
 * enforced separately, at conversion time, by `CurrencyConverter` (recording
 * an old backdated rate is legitimate; using a stale one to represent "now"
 * is not).
 */
@Injectable()
export class CurrencyValidator {
  constructor(
    private readonly repository: CurrencyRepository,
    private readonly registry: CurrencyRegistry,
  ) {}

  async validateRate(request: RecordRateRequest): Promise<CurrencyValidationResult> {
    const issues: CurrencyValidationResult['issues'] = [];
    const warnings: string[] = [];

    const base = request.baseCurrency.toUpperCase();
    const quote = request.quoteCurrency.toUpperCase();

    if (!Number.isFinite(request.rate) || request.rate <= 0) {
      issues.push({
        type: CurrencyValidationIssueType.INVALID_RATE,
        message: `Rate must be a positive, finite number (received ${request.rate})`,
      });
    }

    if (base === quote) {
      issues.push({
        type: CurrencyValidationIssueType.INVALID_RATE,
        message: `Base and quote currency must differ (both are '${base}')`,
      });
    }

    if (!this.registry.isRegistered(base)) {
      issues.push({ type: CurrencyValidationIssueType.CURRENCY_NOT_SUPPORTED, message: `Currency '${base}' is not registered` });
    }
    if (!this.registry.isRegistered(quote)) {
      issues.push({ type: CurrencyValidationIssueType.CURRENCY_NOT_SUPPORTED, message: `Currency '${quote}' is not registered` });
    }

    let isAbnormal = false;

    if (issues.length === 0) {
      const effectiveAt = request.effectiveAt ?? new Date();
      const existing = await this.repository.findExactRate(
        base,
        quote,
        effectiveAt,
        request.workspaceId ?? null,
        request.source,
      );
      if (existing) {
        issues.push({
          type: CurrencyValidationIssueType.DUPLICATE_RATE,
          message: `A ${request.source} rate for '${base}' → '${quote}' already exists at this effective timestamp`,
        });
      }

      const latest = (await this.repository.findLatestPublishedRate(base, quote, request.workspaceId ?? null)) as unknown as
        | IExchangeRate
        | null;
      if (latest && latest.rate > 0) {
        const deviation = Math.abs(request.rate - latest.rate) / latest.rate;
        if (deviation > CURRENCY_CONSTANTS.DEFAULT_ABNORMAL_DEVIATION_THRESHOLD) {
          isAbnormal = true;
          warnings.push(
            `Rate ${request.rate} deviates ${(deviation * 100).toFixed(1)}% from the last published rate ${latest.rate} for '${base}' → '${quote}'`,
          );
        }
      }
    }

    return { valid: issues.length === 0, issues, warnings, isAbnormal };
  }
}
