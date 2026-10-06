import { Injectable } from '@nestjs/common';
import { IPricingConfig, PricingCalculationResult } from '../interfaces';

export interface PricingValidationContext {
  result: PricingCalculationResult;
  config: IPricingConfig | null;
  marketplaceKey: string;
  country: string;
  currency: string;
}

export interface PricingValidationReport {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable()
export class PricingValidationEngine {

  validate(ctx: PricingValidationContext): PricingValidationReport {
    const errors: string[] = [...ctx.result.validationErrors];
    const warnings: string[] = [...ctx.result.warnings];

    // Marketplace rules
    if (!ctx.marketplaceKey || ctx.marketplaceKey.trim() === '') {
      errors.push('marketplaceKey is required');
    }

    // Currency rules
    if (!ctx.currency || ctx.currency.trim() === '') {
      errors.push('currency is required');
    } else if (ctx.config) {
      const allowedCurrencies = this.getAllowedCurrencies(ctx.config);
      if (allowedCurrencies.length > 0 && !allowedCurrencies.includes(ctx.currency.toUpperCase())) {
        errors.push(`Currency '${ctx.currency}' is not supported for marketplace '${ctx.marketplaceKey}'`);
      }
    }

    // Price sanity
    if (ctx.result.marketplaceSellingPrice <= 0) {
      errors.push('Marketplace selling price must be greater than zero');
    }
    if (ctx.result.totalCost < 0) {
      errors.push('Total cost cannot be negative');
    }

    // Margin threshold
    const minMargin = ctx.config?.thresholds?.minMarginPct;
    if (minMargin != null && ctx.result.estimatedMarginPct < minMargin) {
      errors.push(`Margin ${ctx.result.estimatedMarginPct.toFixed(1)}% is below required minimum ${minMargin}%`);
    }

    // ROI threshold
    if (ctx.result.estimatedRoi < -50) {
      errors.push('Extremely negative ROI detected — check cost inputs');
    }

    // Tax rules (basic: non-negative)
    if (ctx.result.breakdown.some((b) => b.component === 'Tax %' && b.computedAmount < 0)) {
      errors.push('Tax amount cannot be negative');
    }

    // Regional rules
    if (ctx.config && ctx.country && ctx.country !== 'GLOBAL') {
      const regionAdj = ctx.config.feeComponents.regionalPriceAdjustmentPct;
      if (regionAdj != null && Math.abs(regionAdj) > 100) {
        warnings.push('Regional price adjustment exceeds ±100% — verify this is intentional');
      }
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  private getAllowedCurrencies(config: IPricingConfig): string[] {
    const rules = config.rules as Record<string, unknown> | null;
    const currencies = rules?.['allowedCurrencies'];
    if (Array.isArray(currencies)) return currencies as string[];
    return [];
  }
}
