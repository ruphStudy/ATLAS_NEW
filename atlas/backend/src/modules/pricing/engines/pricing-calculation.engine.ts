import { Injectable } from '@nestjs/common';
import {
  IPricingConfig,
  PricingCalculationDetail,
  PricingCalculationResult,
  PricingFeeComponents,
  PricingInput,
  PricingStrategy,
  PricingThresholds,
} from '../interfaces';

@Injectable()
export class PricingCalculationEngine {

  calculate(
    input: PricingInput,
    config: IPricingConfig | null,
    strategy?: PricingStrategy,
  ): PricingCalculationResult {
    const resolvedStrategy = strategy ?? input.strategy ?? config?.strategy ?? PricingStrategy.MARGIN_BASED;
    const fees = this.resolveFees(input, config);
    const thresholds = this.resolveThresholds(config);
    const currency = input.currency ?? config?.currency ?? 'USD';

    const costBase = input.landedCost ?? input.procurementCost ?? input.baseCost ?? 0;
    const breakdown: PricingCalculationDetail[] = [];

    // Component calculations
    const commissionAmount = this.pct(costBase, fees.commissionPct, 'Commission %', breakdown);
    const fulfilmentFeeAmount = fees.fulfilmentFeeFlat ?? 0;
    breakdown.push({ component: 'Fulfilment Fee (flat)', inputValue: fees.fulfilmentFeeFlat ?? null, computedAmount: fulfilmentFeeAmount });

    const shippingFeeAmount = fees.shippingFeeFlat ?? 0;
    breakdown.push({ component: 'Shipping Fee (flat)', inputValue: fees.shippingFeeFlat ?? null, computedAmount: shippingFeeAmount });

    const paymentProcessingAmount = this.pct(costBase, fees.paymentProcessingPct, 'Payment Processing %', breakdown);
    const packagingCostAmount = fees.packagingCostFlat ?? 0;
    breakdown.push({ component: 'Packaging Cost (flat)', inputValue: fees.packagingCostFlat ?? null, computedAmount: packagingCostAmount });

    const advertisingCostAmount = this.pct(costBase, fees.advertisingCostPct, 'Advertising Cost %', breakdown);
    const taxAmount = this.pct(costBase, fees.taxPct, 'Tax %', breakdown);
    const promotionalDiscount = Math.abs(input.feeOverrides?.promotionalDiscount ?? 0);
    breakdown.push({ component: 'Promotional Discount', inputValue: input.feeOverrides?.promotionalDiscount ?? null, computedAmount: promotionalDiscount });

    const totalFees =
      commissionAmount +
      fulfilmentFeeAmount +
      shippingFeeAmount +
      paymentProcessingAmount +
      packagingCostAmount +
      advertisingCostAmount +
      taxAmount;

    const totalCost = costBase + totalFees;
    breakdown.push({ component: 'Total Cost', inputValue: costBase, computedAmount: totalCost });

    const sellingPrice = this.computeSellingPrice(
      resolvedStrategy,
      costBase,
      totalCost,
      fees,
      thresholds,
      input,
      breakdown,
    );

    const convRate = fees.currencyConversionRate ?? 1;
    const mpAdjPct = fees.marketplacePriceAdjustmentPct ?? 0;
    const regionAdjPct = fees.regionalPriceAdjustmentPct ?? 0;
    const adjustedPrice = sellingPrice * (1 + mpAdjPct / 100) * (1 + regionAdjPct / 100) * convRate - promotionalDiscount;
    const marketplaceSellingPrice = Math.max(0, Math.round(adjustedPrice * 100) / 100);

    const compareAtPrice =
      input.feeOverrides?.promotionalDiscount && input.feeOverrides.promotionalDiscount > 0
        ? Math.round(sellingPrice * 100) / 100
        : null;

    const estimatedProfit = marketplaceSellingPrice - totalCost;
    const estimatedMarginPct = marketplaceSellingPrice > 0
      ? Math.round(((estimatedProfit / marketplaceSellingPrice) * 100) * 100) / 100
      : 0;
    const estimatedRoi = totalCost > 0
      ? Math.round(((estimatedProfit / totalCost) * 100) * 100) / 100
      : 0;

    const { isValid, validationErrors } = this.validateOutputs(
      marketplaceSellingPrice,
      estimatedMarginPct,
      estimatedRoi,
      estimatedProfit,
      thresholds,
    );

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      suggestedSellingPrice: Math.round(sellingPrice * 100) / 100,
      marketplaceSellingPrice,
      compareAtPrice,
      estimatedProfit: Math.round(estimatedProfit * 100) / 100,
      estimatedMarginPct,
      estimatedRoi,
      breakdown,
      warnings: this.buildWarnings(estimatedMarginPct, estimatedRoi, thresholds),
      isValid,
      validationErrors,
    };
  }

  simulate(
    costBase: number,
    strategy: PricingStrategy,
    fees: Partial<PricingFeeComponents>,
    thresholds: Partial<PricingThresholds>,
  ): PricingCalculationResult {
    const mockInput: PricingInput = {
      catalogProductId: '__sim__',
      workspaceId: '__sim__',
      marketplaceKey: '__sim__',
      landedCost: costBase,
      feeOverrides: fees,
    };
    const mockConfig: IPricingConfig = {
      id: '__sim__',
      workspaceId: '__sim__',
      marketplaceKey: '__sim__',
      country: 'GLOBAL',
      currency: 'USD',
      strategy,
      isDefault: false,
      isActive: true,
      feeComponents: fees as PricingFeeComponents,
      thresholds: thresholds as PricingThresholds,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return this.calculate(mockInput, mockConfig, strategy);
  }

  // ── Private ───────────────────────────────────────────────

  private resolveFees(input: PricingInput, config: IPricingConfig | null): PricingFeeComponents {
    return {
      ...config?.feeComponents,
      ...input.feeOverrides,
    };
  }

  private resolveThresholds(config: IPricingConfig | null): PricingThresholds {
    return config?.thresholds ?? {};
  }

  private pct(
    base: number,
    pct: number | null | undefined,
    label: string,
    breakdown: PricingCalculationDetail[],
  ): number {
    const amount = pct ? (base * pct) / 100 : 0;
    breakdown.push({ component: label, inputValue: pct ?? null, computedAmount: amount });
    return amount;
  }

  private computeSellingPrice(
    strategy: PricingStrategy,
    costBase: number,
    totalCost: number,
    fees: PricingFeeComponents,
    thresholds: PricingThresholds,
    input: PricingInput,
    breakdown: PricingCalculationDetail[],
  ): number {
    if (input.manualOverridePrice != null) {
      breakdown.push({ component: 'Manual Override', inputValue: input.manualOverridePrice, computedAmount: input.manualOverridePrice });
      return input.manualOverridePrice;
    }

    switch (strategy) {
      case PricingStrategy.FIXED: {
        const price = input.feeOverrides?.marketplacePriceAdjustmentPct
          ? totalCost * (1 + (input.feeOverrides.marketplacePriceAdjustmentPct / 100))
          : totalCost * 1.3;
        breakdown.push({ component: 'Fixed Price', inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.MARGIN_BASED: {
        const margin = (thresholds.targetMarginPct ?? 30) / 100;
        const divisor = 1 - margin;
        const price = divisor > 0 ? totalCost / divisor : totalCost * 1.3;
        breakdown.push({ component: `Margin-based (${thresholds.targetMarginPct ?? 30}%)`, inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.ROI_BASED: {
        const roi = (thresholds.targetRoi ?? 50) / 100;
        const price = totalCost * (1 + roi);
        breakdown.push({ component: `ROI-based (${thresholds.targetRoi ?? 50}%)`, inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.COST_PLUS: {
        const markupPct = fees.marketplacePriceAdjustmentPct ?? 25;
        const price = totalCost * (1 + markupPct / 100);
        breakdown.push({ component: `Cost Plus (${markupPct}%)`, inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.COMPETITIVE: {
        const competitor = input.competitorPrice;
        if (competitor && competitor > 0) {
          const price = competitor * 0.98; // 2% below competitor
          breakdown.push({ component: 'Competitive (-2% of competitor)', inputValue: competitor, computedAmount: price });
          return price;
        }
        // Fallback to margin-based
        const margin = (thresholds.targetMarginPct ?? 30) / 100;
        const price = (1 - margin) > 0 ? totalCost / (1 - margin) : totalCost * 1.3;
        breakdown.push({ component: 'Competitive (fallback to margin)', inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.MARKETPLACE_SPECIFIC:
      case PricingStrategy.REGIONAL: {
        const adjPct = fees.marketplacePriceAdjustmentPct ?? fees.regionalPriceAdjustmentPct ?? 20;
        const margin = (thresholds.targetMarginPct ?? 30) / 100;
        const basePrice = (1 - margin) > 0 ? totalCost / (1 - margin) : totalCost * 1.3;
        const price = basePrice * (1 + adjPct / 100);
        breakdown.push({ component: `Adjusted Price (${adjPct}%)`, inputValue: null, computedAmount: price });
        return price;
      }

      case PricingStrategy.RULE_BASED: {
        // Rule-based: apply margin then any rule overrides
        const margin = (thresholds.targetMarginPct ?? 30) / 100;
        const price = (1 - margin) > 0 ? totalCost / (1 - margin) : totalCost * 1.3;
        breakdown.push({ component: 'Rule-based (margin foundation)', inputValue: null, computedAmount: price });
        return price;
      }

      default: {
        const price = totalCost * 1.3;
        breakdown.push({ component: 'Default (30% markup)', inputValue: null, computedAmount: price });
        return price;
      }
    }
  }

  private validateOutputs(
    sellingPrice: number,
    marginPct: number,
    roi: number,
    profit: number,
    thresholds: PricingThresholds,
  ): { isValid: boolean; validationErrors: string[] } {
    const errors: string[] = [];

    if (sellingPrice <= 0) errors.push('Selling price must be positive');

    if (thresholds.minMarginPct != null && marginPct < thresholds.minMarginPct) {
      errors.push(`Margin ${marginPct.toFixed(1)}% is below minimum ${thresholds.minMarginPct}%`);
    }
    if (thresholds.targetRoi != null && roi < 0) {
      errors.push('Estimated ROI is negative');
    }
    if (thresholds.minProfitFlat != null && profit < thresholds.minProfitFlat) {
      errors.push(`Estimated profit ${profit.toFixed(2)} is below minimum ${thresholds.minProfitFlat}`);
    }

    return { isValid: errors.length === 0, validationErrors: errors };
  }

  private buildWarnings(
    marginPct: number,
    roi: number,
    thresholds: PricingThresholds,
  ): string[] {
    const warnings: string[] = [];
    if (thresholds.targetMarginPct != null && marginPct < thresholds.targetMarginPct) {
      warnings.push(`Margin ${marginPct.toFixed(1)}% is below target ${thresholds.targetMarginPct}%`);
    }
    if (thresholds.targetRoi != null && roi < thresholds.targetRoi) {
      warnings.push(`ROI ${roi.toFixed(1)}% is below target ${thresholds.targetRoi}%`);
    }
    if (marginPct < 0) {
      warnings.push('Negative margin detected — consider revising cost structure');
    }
    return warnings;
  }
}
