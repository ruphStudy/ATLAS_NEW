import { AdapterCapabilityValidator, CapabilityValidationError, StrategyValidationError } from '../adapters/adapter-capability.validator';
import { AdapterCapability, AdapterMetadata, IntegrationStrategy } from '../adapters/adapter.types';

function makeMetadata(
  capabilities: AdapterCapability[],
  strategies: IntegrationStrategy[] = [IntegrationStrategy.REST_API],
): AdapterMetadata {
  return {
    providerCode: 'TEST_PROVIDER',
    displayName: 'Test',
    description: '',
    version: { major: 1, minor: 0, patch: 0 },
    supportedRegions: [],
    supportedCountries: ['IN', 'CN'],
    supportedCurrencies: ['INR', 'CNY'],
    capabilities,
    integrationStrategies: strategies,
    rateLimitPerMinute: 60,
    timeoutMs: 10_000,
    maxRetries: 3,
    requiresCredentials: false,
    credentialFields: [],
  };
}

describe('AdapterCapabilityValidator', () => {
  let validator: AdapterCapabilityValidator;

  beforeEach(() => {
    validator = new AdapterCapabilityValidator();
  });

  it('does not throw for supported capability', () => {
    const meta = makeMetadata([AdapterCapability.SEARCH_SUPPLIERS]);
    expect(() => validator.validateCapability(meta, AdapterCapability.SEARCH_SUPPLIERS)).not.toThrow();
  });

  it('throws CapabilityValidationError for unsupported capability', () => {
    const meta = makeMetadata([AdapterCapability.SEARCH_SUPPLIERS]);
    expect(() => validator.validateCapability(meta, AdapterCapability.REQUEST_QUOTATION)).toThrow(
      CapabilityValidationError,
    );
  });

  it('does not throw for supported strategy', () => {
    const meta = makeMetadata([], [IntegrationStrategy.REST_API]);
    expect(() => validator.validateStrategy(meta, IntegrationStrategy.REST_API)).not.toThrow();
  });

  it('throws StrategyValidationError for unsupported strategy', () => {
    const meta = makeMetadata([], [IntegrationStrategy.REST_API]);
    expect(() => validator.validateStrategy(meta, IntegrationStrategy.EMAIL_RFQ)).toThrow(
      StrategyValidationError,
    );
  });

  it('validates country (supported)', () => {
    const meta = makeMetadata([]);
    expect(validator.validateCountry(meta, 'IN')).toBe(true);
  });

  it('validates country (unsupported)', () => {
    const meta = makeMetadata([]);
    expect(validator.validateCountry(meta, 'US')).toBe(false);
  });

  it('returns true for global adapter (empty country list)', () => {
    const meta = { ...makeMetadata([]), supportedCountries: [] };
    expect(validator.validateCountry(meta, 'US')).toBe(true);
  });

  it('canHandle returns false for unsupported capability', () => {
    const meta = makeMetadata([AdapterCapability.SEARCH_SUPPLIERS]);
    expect(validator.canHandle(meta, AdapterCapability.TRACK_SHIPMENT)).toBe(false);
  });

  it('canHandle respects strategy when provided', () => {
    const meta = makeMetadata([AdapterCapability.SEARCH_SUPPLIERS], [IntegrationStrategy.REST_API]);
    expect(
      validator.canHandle(meta, AdapterCapability.SEARCH_SUPPLIERS, IntegrationStrategy.EMAIL_RFQ),
    ).toBe(false);
    expect(
      validator.canHandle(meta, AdapterCapability.SEARCH_SUPPLIERS, IntegrationStrategy.REST_API),
    ).toBe(true);
  });
});
