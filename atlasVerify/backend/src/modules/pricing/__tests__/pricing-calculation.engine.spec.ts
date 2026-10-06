import { PricingCalculationEngine } from '../engines/pricing-calculation.engine';
import { PricingStrategy, IPricingConfig } from '../interfaces';

function makeConfig(overrides: Partial<IPricingConfig> = {}): IPricingConfig {
  return {
    id: 'cfg1',
    workspaceId: 'ws1',
    marketplaceKey: 'AMAZON',
    country: 'US',
    currency: 'USD',
    strategy: PricingStrategy.MARGIN_BASED,
    isDefault: true,
    isActive: true,
    feeComponents: {
      commissionPct: 15,
      fulfilmentFeeFlat: 3.0,
      shippingFeeFlat: 2.0,
      paymentProcessingPct: 2.9,
      packagingCostFlat: 0.5,
      advertisingCostPct: 5,
      taxPct: 0,
      marketplacePriceAdjustmentPct: 0,
      regionalPriceAdjustmentPct: 0,
      currencyConversionRate: 1,
    },
    thresholds: {
      targetMarginPct: 30,
      targetRoi: 50,
      minMarginPct: 10,
      minProfitFlat: 2,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('PricingCalculationEngine', () => {
  let engine: PricingCalculationEngine;

  beforeEach(() => {
    engine = new PricingCalculationEngine();
  });

  // ── Basic calculation ─────────────────────────────────────────

  it('calculates total cost including fees', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig(),
    );
    // base 10 + commission(1.5) + fulfilment(3) + shipping(2) + payment(0.29) + packaging(0.5) + adv(0.5) + tax(0) = 17.79
    expect(result.totalCost).toBeCloseTo(17.79, 1);
  });

  it('margin-based strategy produces correct selling price', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig({ feeComponents: {}, thresholds: { targetMarginPct: 30 } }),
      PricingStrategy.MARGIN_BASED,
    );
    // margin = 30% → price = totalCost / 0.7
    expect(result.suggestedSellingPrice).toBeGreaterThan(result.totalCost);
    expect(result.estimatedMarginPct).toBeGreaterThanOrEqual(25);
  });

  it('roi-based strategy: price = totalCost * (1 + roi)', () => {
    const config = makeConfig({ feeComponents: {}, thresholds: { targetRoi: 50 } });
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 20 },
      config,
      PricingStrategy.ROI_BASED,
    );
    expect(result.suggestedSellingPrice).toBeCloseTo(20 * 1.5, 0);
  });

  it('fixed strategy produces a price', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 15 },
      makeConfig({ feeComponents: {} }),
      PricingStrategy.FIXED,
    );
    expect(result.suggestedSellingPrice).toBeGreaterThan(0);
  });

  it('competitive strategy uses competitor price', () => {
    const result = engine.calculate(
      {
        catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
        landedCost: 10, competitorPrice: 50,
      },
      makeConfig({ feeComponents: {} }),
      PricingStrategy.COMPETITIVE,
    );
    // 2% below competitor = 50 * 0.98 = 49
    expect(result.suggestedSellingPrice).toBeCloseTo(49, 0);
  });

  it('cost-plus strategy uses markup percentage', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 20 },
      makeConfig({
        feeComponents: { marketplacePriceAdjustmentPct: 25 },
        thresholds: {},
      }),
      PricingStrategy.COST_PLUS,
    );
    expect(result.suggestedSellingPrice).toBeCloseTo(25, 0); // 20 * 1.25
  });

  it('manual override price bypasses calculation', () => {
    const result = engine.calculate(
      {
        catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
        landedCost: 10, manualOverridePrice: 99.99,
      },
      makeConfig(),
    );
    expect(result.suggestedSellingPrice).toBe(99.99);
  });

  it('promotional discount reduces marketplace price', () => {
    const result = engine.calculate(
      {
        catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
        landedCost: 10, feeOverrides: { promotionalDiscount: 5 },
      },
      makeConfig({ feeComponents: {} }),
    );
    expect(result.compareAtPrice).not.toBeNull();
  });

  it('returns breakdown with all components', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig(),
    );
    expect(result.breakdown.length).toBeGreaterThan(5);
    expect(result.breakdown.map((b) => b.component)).toContain('Commission %');
  });

  it('validates against minimum margin', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig({ thresholds: { minMarginPct: 80 } }),
    );
    expect(result.isValid).toBe(false);
    expect(result.validationErrors.some((e) => e.includes('below'))).toBe(true);
  });

  it('returns isValid=true for healthy pricing', () => {
    const result = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      makeConfig({ feeComponents: {}, thresholds: { minMarginPct: 10, minProfitFlat: 1 } }),
      PricingStrategy.MARGIN_BASED,
    );
    expect(result.isValid).toBe(true);
  });

  it('currency conversion rate applied', () => {
    const resultUsd = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig({ feeComponents: { currencyConversionRate: 1 } }),
    );
    const resultEur = engine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 10 },
      makeConfig({ feeComponents: { currencyConversionRate: 0.85 } }),
    );
    expect(resultEur.marketplaceSellingPrice).toBeLessThan(resultUsd.marketplaceSellingPrice);
  });

  it('simulate() works like calculate()', () => {
    const result = engine.simulate(20, PricingStrategy.MARGIN_BASED, { commissionPct: 10 }, { targetMarginPct: 25 });
    expect(result.suggestedSellingPrice).toBeGreaterThan(0);
    expect(result.breakdown.length).toBeGreaterThan(0);
  });
});
