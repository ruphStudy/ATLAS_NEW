import { PricingValidationEngine } from '../engines/pricing-validation.engine';
import { PricingCalculationEngine } from '../engines/pricing-calculation.engine';
import { PricingStrategy, IPricingConfig } from '../interfaces';

function makeConfig(overrides: Partial<IPricingConfig> = {}): IPricingConfig {
  return {
    id: 'cfg1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
    country: 'US', currency: 'USD',
    strategy: PricingStrategy.MARGIN_BASED,
    isDefault: true, isActive: true,
    feeComponents: { commissionPct: 10 },
    thresholds: { minMarginPct: 10, targetMarginPct: 30 },
    createdAt: new Date(), updatedAt: new Date(),
    ...overrides,
  };
}

describe('PricingValidationEngine', () => {
  let validationEngine: PricingValidationEngine;
  let calculationEngine: PricingCalculationEngine;

  beforeEach(() => {
    validationEngine = new PricingValidationEngine();
    calculationEngine = new PricingCalculationEngine();
  });

  it('passes for valid pricing', () => {
    const config = makeConfig({ feeComponents: {}, thresholds: { minMarginPct: 5 } });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      config,
      PricingStrategy.MARGIN_BASED,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: 'AMAZON', country: 'US', currency: 'USD',
    });
    expect(report.isValid).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('fails when marketplaceKey is empty', () => {
    const config = makeConfig({ feeComponents: {}, thresholds: {} });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: '', landedCost: 5 },
      config,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: '', country: 'US', currency: 'USD',
    });
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('marketplaceKey'))).toBe(true);
  });

  it('fails when currency is missing', () => {
    const config = makeConfig({ feeComponents: {}, thresholds: {} });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      config,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: 'AMAZON', country: 'US', currency: '',
    });
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('currency'))).toBe(true);
  });

  it('fails when below minimum margin', () => {
    const config = makeConfig({ feeComponents: {}, thresholds: { minMarginPct: 90 } });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      config,
      PricingStrategy.MARGIN_BASED,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: 'AMAZON', country: 'US', currency: 'USD',
    });
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('below required minimum'))).toBe(true);
  });

  it('validates currency against allowed list', () => {
    const config = makeConfig({
      feeComponents: {}, thresholds: {},
      rules: { allowedCurrencies: ['USD', 'EUR'] },
    });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      config,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: 'AMAZON', country: 'US', currency: 'JPY',
    });
    expect(report.isValid).toBe(false);
    expect(report.errors.some((e) => e.includes('JPY'))).toBe(true);
  });

  it('warns on large regional adjustment', () => {
    const config = makeConfig({
      feeComponents: { regionalPriceAdjustmentPct: 150 },
      thresholds: {},
    });
    const result = calculationEngine.calculate(
      { catalogProductId: 'p1', workspaceId: 'ws1', marketplaceKey: 'AMAZON', landedCost: 5 },
      config,
    );
    const report = validationEngine.validate({
      result, config, marketplaceKey: 'AMAZON', country: 'IN', currency: 'USD',
    });
    expect(report.warnings.some((w) => w.includes('100%'))).toBe(true);
  });
});
