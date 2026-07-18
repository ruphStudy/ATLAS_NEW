import { Injectable, Logger } from '@nestjs/common';
import {
  IProfitProvider,
  ProfitProvider,
  ProfitProviderOptions,
  ProfitCalculationData,
  CostBreakdown,
  ProfitBreakdown,
} from '../../interfaces';
import { PROFIT_CONSTANTS } from '../../constants';

/**
 * Amazon FBA Profit Provider
 *
 * Calculates profitability using Amazon FBA fee structures.
 * Fee tables are expressed as configuration constants and can be replaced
 * with live SP-API Fees API calls in production.
 */
@Injectable()
export class AmazonFbaProvider implements IProfitProvider {
  readonly providerName = ProfitProvider.AMAZON_FBA;
  private readonly logger = new Logger(AmazonFbaProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async calculate(options: ProfitProviderOptions): Promise<ProfitCalculationData> {
    this.logger.log(
      `Running Amazon FBA profit calculation for keyword="${options.keyword}" marketplace="${options.marketplace}"`,
    );

    // ── Cost inputs (caller overrides take priority) ──────────
    const productCost = options.productCost ?? this.estimateProductCost(options);
    const shippingCost = options.shippingCost ?? this.estimateShippingCost(options);
    const packagingCost = options.packagingCost ?? 0.5;
    const advertisingCost = options.advertisingCost ?? this.estimateAdvertisingCost(options);
    const taxRate = options.taxRate ?? PROFIT_CONSTANTS.DEFAULT_TAX_RATE;

    // ── Marketplace fees ──────────────────────────────────────
    const sellingPrice = options.sellingPrice ?? this.estimateSellingPrice(options);
    const referralFeeRate = this.getReferralFeeRate(options.category);
    const marketplaceFees = Math.round(sellingPrice * referralFeeRate * 100) / 100;

    // ── FBA fees ──────────────────────────────────────────────
    const fbaFees = this.getFbaFulfillmentFee(options);

    // ── Tax ───────────────────────────────────────────────────
    const tax = Math.round(productCost * taxRate * 100) / 100;

    // ── Totals ────────────────────────────────────────────────
    const totalLandedCost = Math.round(
      (productCost + shippingCost + packagingCost + advertisingCost + tax + marketplaceFees + fbaFees) * 100,
    ) / 100;

    const grossProfit = Math.round((sellingPrice - productCost - shippingCost - packagingCost) * 100) / 100;
    const netProfit = Math.round((sellingPrice - totalLandedCost) * 100) / 100;
    const profitMargin = sellingPrice > 0
      ? Math.round((netProfit / sellingPrice) * 10000) / 100
      : 0;
    const roi = totalLandedCost > 0
      ? Math.round((netProfit / totalLandedCost) * 10000) / 100
      : 0;
    const breakEvenPrice = Math.round(totalLandedCost * 100) / 100;

    const costs: CostBreakdown = {
      productCost,
      shippingCost,
      packagingCost,
      advertisingCost,
      tax,
      marketplaceFees,
      fbaFees,
      totalLandedCost,
    };

    const profit: ProfitBreakdown = {
      sellingPrice,
      grossProfit,
      netProfit,
      profitMargin,
      roi,
      breakEvenPrice,
    };

    const profitScore = this.calculateScore(profit);

    return {
      costs,
      profit,
      profitScore,
      rawData: { options, feeRates: { referralFeeRate, fbaFees } },
    };
  }

  // ── Private: fee tables ──────────────────────────────────────

  private getReferralFeeRate(category?: string | null): number {
    const rates: Record<string, number> = {
      electronics: 0.08,
      computers: 0.08,
      'camera & photo': 0.08,
      'cell phones': 0.08,
      clothing: 0.17,
      shoes: 0.15,
      jewelry: 0.20,
      beauty: 0.15,
      health: 0.15,
      sports: 0.15,
      toys: 0.15,
      'home & kitchen': 0.15,
      'tools & home improvement': 0.15,
      automotive: 0.12,
      books: 0.15,
      'office products': 0.15,
    };

    if (!category) return PROFIT_CONSTANTS.DEFAULT_AMAZON_REFERRAL_FEE_RATE;
    return rates[category.toLowerCase()] ?? PROFIT_CONSTANTS.DEFAULT_AMAZON_REFERRAL_FEE_RATE;
  }

  private getFbaFulfillmentFee(options: ProfitProviderOptions): number {
    // Simplified FBA fee table (size tier → fee)
    // In production: call SP-API GetMyFeesEstimate
    return PROFIT_CONSTANTS.DEFAULT_FBA_FULFILLMENT_FEE;
  }

  // ── Private: estimation helpers ──────────────────────────────

  private estimateProductCost(_options: ProfitProviderOptions): number {
    // Stub: returns a reasonable baseline; replace with supplier data integration
    return 8.0;
  }

  private estimateShippingCost(_options: ProfitProviderOptions): number {
    return 2.0;
  }

  private estimateAdvertisingCost(options: ProfitProviderOptions): number {
    // 10% of estimated selling price as baseline PPC budget
    const price = this.estimateSellingPrice(options);
    return Math.round(price * 0.10 * 100) / 100;
  }

  private estimateSellingPrice(_options: ProfitProviderOptions): number {
    // Stub: in production, pull from competition analysis or marketplace data
    return 29.99;
  }

  // ── Private: scoring ─────────────────────────────────────────

  private calculateScore(profit: ProfitBreakdown): number {
    // Margin component (0–50 pts)
    let marginScore = 0;
    if (profit.profitMargin >= PROFIT_CONSTANTS.EXCELLENT_MARGIN) marginScore = 50;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.GOOD_MARGIN) marginScore = 37.5;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.ACCEPTABLE_MARGIN) marginScore = 25;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.POOR_MARGIN) marginScore = 12.5;

    // ROI component (0–35 pts)
    let roiScore = 0;
    if (profit.roi >= PROFIT_CONSTANTS.EXCELLENT_ROI) roiScore = 35;
    else if (profit.roi >= PROFIT_CONSTANTS.GOOD_ROI) roiScore = 26.25;
    else if (profit.roi >= PROFIT_CONSTANTS.ACCEPTABLE_ROI) roiScore = 17.5;
    else if (profit.roi > 0) roiScore = 8.75;

    // Positive net profit check (0–15 pts)
    const netScore = profit.netProfit > 0 ? 15 : 0;

    const total = marginScore + roiScore + netScore;
    return Math.round(Math.min(100, Math.max(0, total)) * 10) / 10;
  }
}
