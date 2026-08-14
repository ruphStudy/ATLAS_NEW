import { Injectable } from '@nestjs/common';
import { TaxRepository } from '../repository/tax.repository';
import { TaxCache } from '../cache/tax.cache';
import {
  ITaxOverride,
  ITaxRule,
  ResolvedTaxRule,
  TaxApplicabilityContext,
  TaxRuleResolutionRequest,
} from '../interfaces';

/**
 * TaxRuleResolver
 *
 * Resolves every PUBLISHED rule applicable to a jurisdiction/tax-type/
 * effective-date/workspace scope, filters by the caller's applicability
 * context (marketplace, product category, customer type, transaction
 * type — all configuration-driven via `ITaxRule.applicability`, never
 * hardcoded here), and applies any authorized `TaxOverride` on top.
 * Threshold/exemption-by-amount checks happen in `TaxCalculator`, which
 * has the taxable base this resolver deliberately does not require.
 */
@Injectable()
export class TaxRuleResolver {
  constructor(
    private readonly repository: TaxRepository,
    private readonly cache: TaxCache,
  ) {}

  async resolve(request: TaxRuleResolutionRequest): Promise<ResolvedTaxRule[]> {
    const effectiveDate = request.effectiveDate ?? new Date();
    const cacheKey = TaxCache.buildRuleSetKey(
      request.jurisdictionCode,
      request.taxType,
      request.workspaceId,
      effectiveDate,
    );

    let rules = this.cache.getRuleSet(cacheKey);
    if (!rules) {
      const raw = await this.repository.findEffectiveRules(
        request.jurisdictionCode,
        effectiveDate,
        request.workspaceId,
        request.taxType,
      );
      rules = raw as unknown as ITaxRule[];
      this.cache.setRuleSet(cacheKey, rules);
    }

    const applicable = rules.filter((rule) => this.matchesApplicability(rule, request.context));
    if (applicable.length === 0) return [];

    const overridesRaw = await this.repository.findOverrides(
      request.jurisdictionCode,
      request.taxType ?? null,
      request.workspaceId,
      request.organizationId,
    );
    const overrides = overridesRaw as unknown as ITaxOverride[];

    return applicable.map((rule) => this.applyOverride(rule, overrides, effectiveDate));
  }

  /**
   * A rule with no criteria configured for a dimension is a wildcard match
   * on that dimension. A rule that DOES declare criteria only matches
   * requests whose corresponding context value is present in that list.
   */
  private matchesApplicability(rule: ITaxRule, context?: TaxApplicabilityContext): boolean {
    const applicability = rule.applicability as {
      marketplaceKeys?: string[];
      productCategories?: string[];
      customerTypes?: string[];
      transactionTypes?: string[];
    };

    if (applicability.marketplaceKeys?.length) {
      if (!context?.marketplaceKey || !applicability.marketplaceKeys.includes(context.marketplaceKey)) return false;
    }
    if (applicability.productCategories?.length) {
      if (!context?.productCategory || !applicability.productCategories.includes(context.productCategory)) return false;
    }
    if (applicability.customerTypes?.length) {
      if (!context?.customerType || !applicability.customerTypes.includes(context.customerType)) return false;
    }
    if (applicability.transactionTypes?.length) {
      if (!context?.transactionType || !applicability.transactionTypes.includes(context.transactionType)) return false;
    }
    return true;
  }

  private applyOverride(rule: ITaxRule, overrides: ITaxOverride[], effectiveDate: Date): ResolvedTaxRule {
    const match = overrides
      .filter((o) => !o.ruleKey || o.ruleKey === rule.ruleKey)
      .filter((o) => !o.effectiveFrom || o.effectiveFrom <= effectiveDate)
      .filter((o) => !o.effectiveTo || o.effectiveTo >= effectiveDate)
      .sort((a, b) => b.priority - a.priority)[0];

    if (!match) {
      return { rule, effectiveRate: rule.rate, overrideApplied: false, exempt: false };
    }

    const overrideValue = match.overrideValue as { rate?: number; exempt?: boolean };
    return {
      rule,
      effectiveRate: overrideValue.rate ?? rule.rate,
      overrideApplied: true,
      exempt: overrideValue.exempt === true,
    };
  }
}
