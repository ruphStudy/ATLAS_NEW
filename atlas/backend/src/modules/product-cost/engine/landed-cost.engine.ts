import { Injectable, Logger } from '@nestjs/common';
import { CostBreakdown, CostComponents } from '../interfaces';
import { PRODUCT_COST_CONSTANTS } from '../constants';

/**
 * Landed Cost Engine
 *
 * Pure calculation logic — no I/O, no side effects.
 * Accepts CostComponents and returns a fully computed CostBreakdown.
 */
@Injectable()
export class LandedCostEngine {
  private readonly logger = new Logger(LandedCostEngine.name);

  calculate(inputs: CostComponents): CostBreakdown {
    const {
      supplierUnitPrice,
      quantity,
      moq = null,
      shippingCost = null,
      freightCost = null,
      customsDutyPercent = null,
      importCharges = null,
      packagingCostPerUnit = null,
      labelingCostPerUnit = null,
      inspectionCost = null,
      miscCharges = null,
      sourceCurrency = PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY,
      targetCurrency = PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY,
      exchangeRate = PRODUCT_COST_CONSTANTS.DEFAULT_EXCHANGE_RATE,
      taxPercent = null,
    } = inputs;

    const rate = exchangeRate ?? PRODUCT_COST_CONSTANTS.DEFAULT_EXCHANGE_RATE;
    const src = sourceCurrency ?? PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY;
    const tgt = targetCurrency ?? PRODUCT_COST_CONSTANTS.DEFAULT_CURRENCY;

    // Supplier price subtotal (converted to target currency)
    const supplierPriceSubtotal = this.round(supplierUnitPrice * quantity * rate);

    // MOQ impact: if qty < MOQ the buyer effectively pays for MOQ units
    // moqImpact = (MOQ − qty) × unitPrice × exchangeRate  (>= 0)
    const moqImpact =
      moq !== null && moq > quantity
        ? this.round((moq - quantity) * supplierUnitPrice * rate)
        : 0;

    const shipping = this.round(shippingCost ?? 0);
    const freight = this.round(freightCost ?? 0);

    // Customs duty on supplier price subtotal
    const customsDuty =
      customsDutyPercent !== null
        ? this.round((customsDutyPercent / 100) * supplierPriceSubtotal)
        : 0;

    const imports = this.round(importCharges ?? 0);
    const packaging = this.round((packagingCostPerUnit ?? 0) * quantity);
    const labeling = this.round((labelingCostPerUnit ?? 0) * quantity);
    const inspection = this.round(inspectionCost ?? 0);
    const misc = this.round(miscCharges ?? 0);

    // Pre-tax total
    const preTaxTotal =
      supplierPriceSubtotal +
      moqImpact +
      shipping +
      freight +
      customsDuty +
      imports +
      packaging +
      labeling +
      inspection +
      misc;

    const tax =
      taxPercent !== null ? this.round((taxPercent / 100) * preTaxTotal) : 0;

    const totalLandedCost = this.round(preTaxTotal + tax);
    const costPerUnit = this.round(totalLandedCost / quantity);

    this.logger.debug(
      `Landed cost: total=${totalLandedCost} perUnit=${costPerUnit} currency=${tgt}`,
    );

    return {
      supplierUnitPrice,
      quantity,
      moq,
      supplierPriceSubtotal,
      moqImpact,
      shippingCost: shipping,
      freightCost: freight,
      customsDuty,
      importCharges: imports,
      packagingCost: packaging,
      labelingCost: labeling,
      inspectionCost: inspection,
      miscCharges: misc,
      tax,
      totalLandedCost,
      costPerUnit,
      sourceCurrency: src,
      targetCurrency: tgt,
      exchangeRate: rate,
    };
  }

  private round(n: number): number {
    return Math.round(n * 10000) / 10000;
  }
}
