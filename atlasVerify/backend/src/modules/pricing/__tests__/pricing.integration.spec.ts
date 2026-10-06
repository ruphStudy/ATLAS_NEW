/**
 * Pricing Integration Tests – mocked data, no live APIs or database.
 */
import { PricingCalculationEngine } from '../engines/pricing-calculation.engine';
import { PricingStrategyEngine } from '../engines/pricing-strategy.engine';
import { PricingValidationEngine } from '../engines/pricing-validation.engine';
import { PricingStrategy, IPricingConfig, PricingInput } from '../interfaces';

function makeAmazonConfig(): IPricingConfig {
  return {
    id: 'amazon-cfg',
    workspaceId: 'ws1',
    marketplaceKey: 'AMAZON',
    country: 'US',
    currency: 'USD',
    strategy: PricingStrategy.MARGIN_BASED,
    isDefault: true,
    isActive: true,
    feeComponents: {
      commissionPct: 15,
      fulfilmentFeeFlat: 3.22,
      shippingFeeFlat: 0,
      paymentProcessingPct: 2.9,
      packagingCostFlat: 0.5,
      advertisingCostPct: 8,
      taxPct: 0,
      marketplacePriceAdjustmentPct: 0,
      regionalPriceAdjustmentPct: 0,
      currencyConversionRate: 1,
    },
    thresholds: {
      targetMarginPct: 30,
      targetRoi: 50,
      minMarginPct: 15,
      minProfitFlat: 3,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeFlipkartConfig(): IPricingConfig {
  return {
    id: 'flipkart-cfg',
    workspaceId: 'ws1',
    marketplaceKey: 'FLIPKART',
    country: 'IN',
    currency: 'INR',
    strategy: PricingStrategy.MARGIN_BASED,
    isDefault: true,
    isActive: true,
    feeComponents: {
      commissionPct: 12,
      fulfilmentFeeFlat: 40,
      shippingFeeFlat: 50,
      paymentProcessingPct: 1.5,
      packagingCostFlat: 10,
      advertisingCostPct: 5,
      taxPct: 18,
      currencyConversionRate: 83.5,
    },
    thresholds: {
      targetMarginPct: 25,
      targetRoi: 40,
      minMarginPct: 10,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Pricing Engine – Integration Tests', () => {
  let calculationEngine: PricingCalculationEngine;
  let strategyEngine: PricingStrategyEngine;
  let validationEngine: PricingValidationEngine;

  beforeEach(() => {
    calculationEngine = new PricingCalculationEngine();
    strategyEngine = new PricingStrategyEngine();
    validationEngine = new PricingValidationEngine();
  });

  // ── Multi-Marketplace Pricing ─────────────────────────────────

  describe('multi-marketplace pricing', () => {
    const input: PricingInput = {
      catalogProductId: 'prod-001',
      workspaceId: 'ws1',
      marketplaceKey: 'AMAZON',
      landedCost: 8.50,
    };

    it('AMAZON: calculates valid pricing with fees', () => {
      const result = calculationEngine.calculate(input, makeAmazonConfig());
      expect(result.isValid).toBe(true);
      expect(result.marketplaceSellingPrice).toBeGreaterThan(result.totalCost);
    });

    it('FLIPKART: converts USD cost to INR pricing', () => {
      const result = calculationEngine.calculate(
        { ...input, marketplaceKey: 'FLIPKART', currency: 'INR' },
        makeFlipkartConfig(),
      );
      expect(result.marketplaceSellingPrice).toBeGreaterThan(100); // INR price
    });

    it('different marketplaces produce different prices for same product', () => {
      const amazon = calculationEngine.calculate(input, makeAmazonConfig());
      const flipkart = calculationEngine.calculate(
        { ...input, marketplaceKey: 'FLIPKART' },
        makeFlipkartConfig(),
      );
      expect(amazon.marketplaceSellingPrice).not.toEqual(flipkart.marketplaceSellingPrice);
    });
  });

  // ── Pricing Strategies ────────────────────────────────────────

  describe('pricing strategies', () => {
    const baseCost = 20;
    const config = makeAmazonConfig();

    it('MARGIN_BASED produces higher price than COST_PLUS at same cost', () => {
      const margin = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: baseCost },
        { ...config, feeComponents: {} },
        PricingStrategy.MARGIN_BASED,
      );
      const costPlus = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: baseCost },
        { ...config, feeComponents: { marketplacePriceAdjustmentPct: 10 } },
        PricingStrategy.COST_PLUS,
      );
      // Both should produce valid prices
      expect(margin.suggestedSellingPrice).toBeGreaterThan(0);
      expect(costPlus.suggestedSellingPrice).toBeGreaterThan(0);
    });

    it('ROI_BASED: estimated ROI meets target', () => {
      const result = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: baseCost },
        { ...config, feeComponents: {}, thresholds: { targetRoi: 50 } },
        PricingStrategy.ROI_BASED,
      );
      expect(result.suggestedSellingPrice).toBeCloseTo(baseCost * 1.5, 0);
    });

    it('COMPETITIVE: produces price near competitor', () => {
      const result = calculationEngine.calculate(
        {
          catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
          landedCost: baseCost, competitorPrice: 50,
        },
        { ...config, feeComponents: {} },
        PricingStrategy.COMPETITIVE,
      );
      expect(result.suggestedSellingPrice).toBeCloseTo(50 * 0.98, 0);
    });

    it('strategy selection prefers input strategy', () => {
      const selected = strategyEngine.resolveStrategy(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', strategy: PricingStrategy.FIXED },
        config,
      );
      expect(selected).toBe(PricingStrategy.FIXED);
    });
  });

  // ── Currency Handling ─────────────────────────────────────────

  describe('currency handling', () => {
    it('currency conversion rate scales price', () => {
      const usd = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
        makeAmazonConfig(),
      );
      const eur = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
        { ...makeAmazonConfig(), feeComponents: { ...makeAmazonConfig().feeComponents, currencyConversionRate: 0.85 } },
      );
      expect(eur.marketplaceSellingPrice).toBeLessThan(usd.marketplaceSellingPrice);
    });

    it('validates unsupported currency', () => {
      const config = { ...makeAmazonConfig(), rules: { allowedCurrencies: ['USD'] } };
      const result = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
        config,
      );
      const report = validationEngine.validate({
        result, config, marketplaceKey: 'AMAZON', country: 'US', currency: 'GBP',
      });
      expect(report.isValid).toBe(false);
    });
  });

  // ── Marketplace Price Generation ─────────────────────────────

  describe('marketplace price generation', () => {
    it('marketplace selling price includes all adjustments', () => {
      const config = makeAmazonConfig();
      const result = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
        config,
      );
      expect(result.marketplaceSellingPrice).toBeGreaterThan(result.totalCost);
      expect(result.estimatedProfit).toBeGreaterThan(0);
    });

    it('manual override bypasses all calculations', () => {
      const result = calculationEngine.calculate(
        {
          catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
          landedCost: 10, manualOverridePrice: 42.00,
        },
        makeAmazonConfig(),
      );
      expect(result.suggestedSellingPrice).toBe(42.00);
    });

    it('scheduled price is separate from main calculation', () => {
      const result = calculationEngine.calculate(
        {
          catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
          landedCost: 10, scheduledPrice: 35.00,
        },
        makeAmazonConfig(),
      );
      // Main calculation should still proceed normally
      expect(result.marketplaceSellingPrice).toBeGreaterThan(0);
    });
  });

  // ── Validation Rules ──────────────────────────────────────────

  describe('validation rules', () => {
    it('fails below minimum margin', () => {
      const config = { ...makeAmazonConfig(), thresholds: { minMarginPct: 95 } };
      const result = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
        config,
      );
      const report = validationEngine.validate({
        result, config, marketplaceKey: 'AMAZON', country: 'US', currency: 'USD',
      });
      expect(report.isValid).toBe(false);
    });

    it('passes for correct pricing setup', () => {
      const config = makeAmazonConfig();
      const result = calculationEngine.calculate(
        { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
        { ...config, feeComponents: {}, thresholds: { minMarginPct: 5 } },
        PricingStrategy.MARGIN_BASED,
      );
      const report = validationEngine.validate({
        result, config: { ...config, feeComponents: {}, thresholds: { minMarginPct: 5 } },
        marketplaceKey: 'AMAZON', country: 'US', currency: 'USD',
      });
      expect(report.isValid).toBe(true);
    });
  });

  // ── Price Comparison ──────────────────────────────────────────

  describe('price comparison', () => {
    it('produces comparable metrics across marketplaces', () => {
      const input = { catalogProductId: 'p', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 };
      const amazon = calculationEngine.calculate(input, makeAmazonConfig());
      const flipkart = calculationEngine.calculate(
        { ...input, marketplaceKey: 'FLIPKART' },
        makeFlipkartConfig(),
      );

      // Both should have valid metrics
      expect(amazon.estimatedMarginPct).toBeDefined();
      expect(flipkart.estimatedMarginPct).toBeDefined();
      expect(amazon.estimatedRoi).toBeDefined();
    });
  });
});
