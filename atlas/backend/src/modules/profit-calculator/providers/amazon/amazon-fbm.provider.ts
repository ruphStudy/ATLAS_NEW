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
 * Amazon FBM Profit Provider
 *
 * Calculates profitability for Fulfilled by Merchant (FBM) model.
 * Lower fulfillment overhead but no FBA fee — seller ships direct.
 */
@Injectable()
export class AmazonFbmProvider implements IProfitProvider {
  readonly providerName = ProfitProvider.AMAZON_FBM;
  private readonly logger = new Logger(AmazonFbmProvider.name);

  isAvailable(): boolean {
    return true;
  }

  async calculate(options: ProfitProviderOptions): Promise<ProfitCalculationData> {
    this.logger.log(
      `Running Amazon FBM profit calculation for keyword="${options.keyword}" marketplace="${options.marketplace}"`,
    );

    const productCost = options.productCost ?? 8.0;
    const shippingCost = options.shippingCost ?? 4.5; // FBM ships direct — higher per-unit ship cost
    const packagingCost = options.packagingCost ?? 0.75;
    const advertisingCost = options.advertisingCost ?? 3.0;
    const taxRate = options.taxRate ?? PROFIT_CONSTANTS.DEFAULT_TAX_RATE;
    const sellingPrice = options.sellingPrice ?? 29.99;

    const referralFeeRate = PROFIT_CONSTANTS.DEFAULT_AMAZON_REFERRAL_FEE_RATE;
    const marketplaceFees = Math.round(sellingPrice * referralFeeRate * 100) / 100;
    const fbaFees = 0; // FBM has no FBA fulfillment fee
    const tax = Math.round(productCost * taxRate * 100) / 100;

    const totalLandedCost = Math.round(
      (productCost + shippingCost + packagingCost + advertisingCost + tax + marketplaceFees) * 100,
    ) / 100;

    const grossProfit = Math.round((sellingPrice - productCost - shippingCost - packagingCost) * 100) / 100;
    const netProfit = Math.round((sellingPrice - totalLandedCost) * 100) / 100;
    const profitMargin = sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 10000) / 100 : 0;
    const roi = totalLandedCost > 0 ? Math.round((netProfit / totalLandedCost) * 10000) / 100 : 0;
    const breakEvenPrice = totalLandedCost;

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

    return { costs, profit, profitScore, rawData: { options } };
  }

  private calculateScore(profit: ProfitBreakdown): number {
    let marginScore = 0;
    if (profit.profitMargin >= PROFIT_CONSTANTS.EXCELLENT_MARGIN) marginScore = 50;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.GOOD_MARGIN) marginScore = 37.5;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.ACCEPTABLE_MARGIN) marginScore = 25;
    else if (profit.profitMargin >= PROFIT_CONSTANTS.POOR_MARGIN) marginScore = 12.5;

    let roiScore = 0;
    if (profit.roi >= PROFIT_CONSTANTS.EXCELLENT_ROI) roiScore = 35;
    else if (profit.roi >= PROFIT_CONSTANTS.GOOD_ROI) roiScore = 26.25;
    else if (profit.roi >= PROFIT_CONSTANTS.ACCEPTABLE_ROI) roiScore = 17.5;
    else if (profit.roi > 0) roiScore = 8.75;

    const netScore = profit.netProfit > 0 ? 15 : 0;
    return Math.round(Math.min(100, Math.max(0, marginScore + roiScore + netScore)) * 10) / 10;
  }
}
