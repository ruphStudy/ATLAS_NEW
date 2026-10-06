import { Injectable } from '@nestjs/common';
import { CurrencyRegistry } from '../../currency/registry/currency.registry';
import { roundMoney } from '../../currency/converter/money-rounding.util';
import { RoundingMode } from '../../currency/interfaces';
import {
  CalculationMode,
  ITaxLineBreakdown,
  ITaxRule,
  ResolvedTaxRule,
  TaxApplicabilityContext,
} from '../interfaces';
import { TAX_CONSTANTS } from '../constants';

export interface TaxCalculationOutcome {
  breakdown: ITaxLineBreakdown[];
  totalTaxAmount: number;
  totalReverseChargeAmount: number;
  isExempt: boolean;
  warnings: string[];
}

/**
 * TaxCalculator
 *
 * Computes tax amounts from already-resolved rules — never re-implements
 * pricing/billing/invoice math, only turns a taxable base + rate(s) into
 * a tax amount using the rule's own inclusive/exclusive mode, applying
 * compound-tax composition, threshold, and exemption-code checks.
 * Rounds using the currency engine's own `roundMoney` utility (reused, not
 * duplicated) at the target currency's configured precision.
 */
@Injectable()
export class TaxCalculator {
  constructor(private readonly currencyRegistry: CurrencyRegistry) {}

  calculate(
    resolvedRules: ResolvedTaxRule[],
    taxableBase: number,
    currency: string,
    context?: TaxApplicabilityContext,
  ): TaxCalculationOutcome {
    const breakdown: ITaxLineBreakdown[] = [];
    const amountsByRuleKey = new Map<string, number>();
    const warnings: string[] = [];

    let totalTaxAmount = 0;
    let totalReverseChargeAmount = 0;
    let anyApplied = false;

    const sorted = [...resolvedRules].sort((a, b) => a.rule.priority - b.rule.priority);

    for (const resolved of sorted) {
      const { rule, effectiveRate, exempt } = resolved;

      if (!this.meetsThreshold(rule, taxableBase, currency)) {
        warnings.push(`Rule '${rule.ruleKey}' skipped — taxable base ${taxableBase} is outside its configured threshold`);
        continue;
      }

      if (exempt || this.isExemptByCode(rule, context?.exemptionCodes)) {
        warnings.push(`Rule '${rule.ruleKey}' is exempt for this transaction`);
        continue;
      }

      let base = taxableBase;
      if (rule.isCompound && rule.compoundOnRuleKeys.length) {
        const addOn = rule.compoundOnRuleKeys.reduce((sum, key) => sum + (amountsByRuleKey.get(key) ?? 0), 0);
        base = taxableBase + addOn;
      }

      const rawAmount = this.computeAmount(base, effectiveRate, rule.calculationMode);
      const amount = this.round(rawAmount, currency);
      amountsByRuleKey.set(rule.ruleKey, amount);
      anyApplied = true;

      breakdown.push({
        ruleKey: rule.ruleKey,
        ruleVersion: rule.version,
        taxType: rule.taxType,
        base,
        rate: effectiveRate,
        amount,
        isCompound: rule.isCompound,
        isReverseCharge: rule.reverseCharge,
      });

      if (rule.reverseCharge) {
        totalReverseChargeAmount += amount;
      } else {
        totalTaxAmount += amount;
      }
    }

    return {
      breakdown,
      totalTaxAmount: this.round(totalTaxAmount, currency),
      totalReverseChargeAmount: this.round(totalReverseChargeAmount, currency),
      isExempt: resolvedRules.length > 0 && !anyApplied,
      warnings,
    };
  }

  private computeAmount(base: number, ratePercent: number, mode: CalculationMode): number {
    if (mode === CalculationMode.INCLUSIVE) {
      return base - base / (1 + ratePercent / 100);
    }
    return base * (ratePercent / 100);
  }

  private meetsThreshold(rule: ITaxRule, base: number, currency: string): boolean {
    const t = rule.thresholds;
    if (t.currency && t.currency.toUpperCase() !== currency.toUpperCase()) return true; // threshold defined in a different currency — can't compare, don't block
    if (t.minAmount != null && base < t.minAmount) return false;
    if (t.maxAmount != null && base > t.maxAmount) return false;
    return true;
  }

  private isExemptByCode(rule: ITaxRule, exemptionCodes?: string[]): boolean {
    if (!exemptionCodes?.length || !rule.exemptions.length) return false;
    return exemptionCodes.some((code) => rule.exemptions.includes(code));
  }

  private round(amount: number, currencyCode: string): number {
    const currency = this.currencyRegistry.get(currencyCode);
    const decimals = currency?.decimals ?? TAX_CONSTANTS.DEFAULT_ROUNDING_DECIMALS;
    return roundMoney(amount, decimals, currency?.roundingMode ?? RoundingMode.HALF_UP);
  }
}
