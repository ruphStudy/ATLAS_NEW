import { PricingStrategyEngine } from '../engines/pricing-strategy.engine';
import { PricingStrategy, PricingInput, IPricingConfig } from '../interfaces';

function makeConfig(strategy: PricingStrategy): IPricingConfig {
  return {
    id: 'cfg1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
    country: 'US', currency: 'USD',
    strategy,
    isDefault: true, isActive: true,
    feeComponents: {}, thresholds: {},
    createdAt: new Date(), updatedAt: new Date(),
  };
}

function makeInput(overrides: Partial<PricingInput> = {}): PricingInput {
  return {
    catalogProductId: 'p1',
    workspaceId: 'ws1',
    marketplaceKey: 'AMAZON',
    landedCost: 10,
    ...overrides,
  };
}

describe('PricingStrategyEngine', () => {
  let engine: PricingStrategyEngine;

  beforeEach(() => {
    engine = new PricingStrategyEngine();
  });

  it('resolves strategy from input first', () => {
    const strategy = engine.resolveStrategy(
      makeInput({ strategy: PricingStrategy.ROI_BASED }),
      makeConfig(PricingStrategy.FIXED),
    );
    expect(strategy).toBe(PricingStrategy.ROI_BASED);
  });

  it('falls back to config strategy', () => {
    const strategy = engine.resolveStrategy(makeInput(), makeConfig(PricingStrategy.COMPETITIVE));
    expect(strategy).toBe(PricingStrategy.COMPETITIVE);
  });

  it('falls back to default when no input or config', () => {
    const strategy = engine.resolveStrategy(makeInput(), null);
    expect(strategy).toBe(PricingStrategy.MARGIN_BASED);
  });

  it('FIXED strategy is always applicable', () => {
    expect(engine.isStrategyApplicable(PricingStrategy.FIXED, makeInput({ landedCost: undefined }))).toBe(true);
  });

  it('MARGIN_BASED requires positive cost', () => {
    expect(engine.isStrategyApplicable(PricingStrategy.MARGIN_BASED, makeInput({ landedCost: 0 }))).toBe(false);
    expect(engine.isStrategyApplicable(PricingStrategy.MARGIN_BASED, makeInput({ landedCost: 10 }))).toBe(true);
  });

  it('COMPETITIVE is applicable without competitor price (fallback)', () => {
    expect(engine.isStrategyApplicable(PricingStrategy.COMPETITIVE, makeInput())).toBe(true);
  });

  it('selectBestStrategy returns preferred strategy when applicable', () => {
    const best = engine.selectBestStrategy(
      makeInput({ strategy: PricingStrategy.COST_PLUS }),
      null,
    );
    expect(best).toBe(PricingStrategy.COST_PLUS);
  });

  it('selectBestStrategy falls back if preferred not applicable', () => {
    // MARGIN_BASED requires cost > 0; if baseCost/landedCost missing, fallback
    const best = engine.selectBestStrategy(
      makeInput({ landedCost: undefined, baseCost: undefined, procurementCost: undefined, strategy: PricingStrategy.MARGIN_BASED }),
      null,
    );
    // Should fallback to FIXED
    expect(best).toBe(PricingStrategy.FIXED);
  });

  it('listApplicableStrategies returns at least FIXED', () => {
    const strategies = engine.listApplicableStrategies(makeInput({ landedCost: undefined }));
    expect(strategies).toContain(PricingStrategy.FIXED);
  });

  it('listApplicableStrategies includes MARGIN_BASED when cost present', () => {
    const strategies = engine.listApplicableStrategies(makeInput({ landedCost: 10 }));
    expect(strategies).toContain(PricingStrategy.MARGIN_BASED);
  });
});
