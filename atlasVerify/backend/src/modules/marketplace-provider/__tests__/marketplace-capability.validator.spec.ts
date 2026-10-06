import { MarketplaceCapabilityValidator } from '../capability/marketplace-capability.validator';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceErrorCode,
  MarketplaceHealthStatus,
  MarketplaceKey,
} from '../interfaces';

function makeAdapter(capabilities: MarketplaceCapability[]): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey: 'TEST_PROVIDER',
      providerName: 'Test',
      displayName: 'Test Provider',
      description: '',
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: ['US'],
      supportedRegions: [],
      supportedCurrencies: ['USD'],
      supportedLanguages: ['en'],
      supportedMarketplaces: [MarketplaceKey.AMAZON],
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: false,
      credentialFields: [],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: () => true,
    supportsRegion: () => true,
    supportsMarketplace: () => true,
    validateCredentials: jest.fn(),
    testConnection: jest.fn(),
    healthCheck: jest.fn(),
  };
}

describe('MarketplaceCapabilityValidator', () => {
  let validator: MarketplaceCapabilityValidator;

  beforeEach(() => {
    validator = new MarketplaceCapabilityValidator();
  });

  describe('validate()', () => {
    it('returns supported=true for declared capability', () => {
      const adapter = makeAdapter([MarketplaceCapability.PUBLISH_LISTING]);
      const result = validator.validate(adapter, MarketplaceCapability.PUBLISH_LISTING);
      expect(result.supported).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('returns supported=false for undeclared capability', () => {
      const adapter = makeAdapter([MarketplaceCapability.PUBLISH_LISTING]);
      const result = validator.validate(adapter, MarketplaceCapability.SYNC_INVENTORY);
      expect(result.supported).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.reason).toBeDefined();
    });
  });

  describe('assertSupported()', () => {
    it('does not throw for supported capability', () => {
      const adapter = makeAdapter([MarketplaceCapability.PUBLISH_LISTING]);
      expect(() =>
        validator.assertSupported(adapter, MarketplaceCapability.PUBLISH_LISTING),
      ).not.toThrow();
    });

    it('throws UnsupportedCapabilityError for unsupported capability', () => {
      const adapter = makeAdapter([MarketplaceCapability.PUBLISH_LISTING]);
      expect(() =>
        validator.assertSupported(adapter, MarketplaceCapability.SYNC_INVENTORY),
      ).toThrow();
      try {
        validator.assertSupported(adapter, MarketplaceCapability.SYNC_INVENTORY);
      } catch (err: unknown) {
        expect((err as Record<string, unknown>)['code']).toBe(MarketplaceErrorCode.UNSUPPORTED_CAPABILITY);
        expect((err as Record<string, unknown>)['capability']).toBe(MarketplaceCapability.SYNC_INVENTORY);
      }
    });
  });

  describe('validateAll()', () => {
    it('validates multiple capabilities and returns all results', () => {
      const adapter = makeAdapter([MarketplaceCapability.PUBLISH_LISTING, MarketplaceCapability.UPDATE_LISTING]);
      const results = validator.validateAll(adapter, [
        MarketplaceCapability.PUBLISH_LISTING,
        MarketplaceCapability.UPDATE_LISTING,
        MarketplaceCapability.SYNC_INVENTORY,
      ]);
      expect(results).toHaveLength(3);
      expect(results.filter((r) => r.supported)).toHaveLength(2);
      expect(results.filter((r) => !r.supported)).toHaveLength(1);
    });
  });

  describe('discoverCapabilities()', () => {
    it('maps capabilities to provider keys', () => {
      const adapterA = makeAdapter([MarketplaceCapability.PUBLISH_LISTING]);
      const adapterB = {
        ...makeAdapter([MarketplaceCapability.SYNC_INVENTORY]),
        metadata: {
          ...makeAdapter([MarketplaceCapability.SYNC_INVENTORY]).metadata,
          providerKey: 'PROVIDER_B',
        },
      };

      const map = validator.discoverCapabilities(
        [adapterA, adapterB],
        [MarketplaceCapability.PUBLISH_LISTING, MarketplaceCapability.SYNC_INVENTORY],
      );

      expect(map.get(MarketplaceCapability.PUBLISH_LISTING)).toContain('TEST_PROVIDER');
      expect(map.get(MarketplaceCapability.SYNC_INVENTORY)).toContain('PROVIDER_B');
      expect(map.get(MarketplaceCapability.PUBLISH_LISTING)).not.toContain('PROVIDER_B');
    });
  });
});
