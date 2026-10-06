import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import {
  MarketplaceProviderRegistry,
} from '../registry/marketplace-provider.registry';
import {
  MarketplaceCapability,
  IMarketplaceProviderAdapter,
  MarketplaceKey,
  MarketplaceProviderStatus,
  MarketplaceHealthStatus,
} from '../interfaces';

function makeAdapter(
  providerKey: string,
  capabilities: MarketplaceCapability[] = [
    MarketplaceCapability.PUBLISH_LISTING,
    MarketplaceCapability.HEALTH_CHECK,
  ],
  marketplaces: MarketplaceKey[] = [MarketplaceKey.AMAZON],
  countries: string[] = ['US', 'IN'],
): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey,
      providerName: providerKey,
      displayName: `${providerKey} Adapter`,
      description: `Test adapter for ${providerKey}`,
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: countries,
      supportedRegions: ['us-east-1'],
      supportedCurrencies: ['USD', 'INR'],
      supportedLanguages: ['en'],
      supportedMarketplaces: marketplaces,
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: true,
      credentialFields: [{ key: 'apiKey', label: 'API Key', required: true, sensitive: true, credentialType: 'API_KEY' as any }],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: (c) => countries.includes(c),
    supportsRegion: (r) => r === 'us-east-1',
    supportsMarketplace: (mk) => marketplaces.includes(mk),
    validateCredentials: jest.fn().mockResolvedValue({ valid: true, missing: [], expired: false, errors: [] }),
    testConnection: jest.fn().mockResolvedValue({
      providerKey, status: MarketplaceHealthStatus.HEALTHY, latencyMs: 45, checkedAt: new Date(),
    }),
    healthCheck: jest.fn().mockResolvedValue({
      providerKey, status: MarketplaceHealthStatus.HEALTHY, latencyMs: 45, checkedAt: new Date(),
    }),
  };
}

describe('MarketplaceProviderRegistry', () => {
  let registry: MarketplaceProviderRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceProviderRegistry],
    }).compile();
    registry = module.get<MarketplaceProviderRegistry>(MarketplaceProviderRegistry);
  });

  describe('register()', () => {
    it('registers a provider', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      expect(registry.isRegistered('AMAZON_SP')).toBe(true);
    });

    it('registers multiple providers', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      registry.register(makeAdapter('FLIPKART_SP'));
      expect(registry.getSupportedKeys()).toContain('AMAZON_SP');
      expect(registry.getSupportedKeys()).toContain('FLIPKART_SP');
    });

    it('overwrites on re-register with same key (update)', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const updated = makeAdapter('AMAZON_SP', [MarketplaceCapability.SYNC_INVENTORY]);
      registry.update('AMAZON_SP', updated);
      const adapter = registry.get('AMAZON_SP');
      expect(adapter.supportsCapability(MarketplaceCapability.SYNC_INVENTORY)).toBe(true);
    });
  });

  describe('get()', () => {
    it('returns registered adapter', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const adapter = registry.get('AMAZON_SP');
      expect(adapter.metadata.providerKey).toBe('AMAZON_SP');
    });

    it('throws NotFoundException for unregistered provider', () => {
      expect(() => registry.get('NONEXISTENT')).toThrow(NotFoundException);
    });

    it('is case-insensitive', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      expect(() => registry.get('amazon_sp')).not.toThrow();
    });
  });

  describe('enable() / disable()', () => {
    it('disables and re-enables a provider', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      registry.disable('AMAZON_SP');
      expect(registry.isActive('AMAZON_SP')).toBe(false);
      registry.enable('AMAZON_SP');
      expect(registry.isActive('AMAZON_SP')).toBe(true);
    });

    it('disabled provider not returned by getActive()', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      registry.disable('AMAZON_SP');
      expect(registry.getActive()).toHaveLength(0);
    });
  });

  describe('remove()', () => {
    it('removes a registered provider', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      registry.remove('AMAZON_SP');
      expect(registry.isRegistered('AMAZON_SP')).toBe(false);
    });

    it('throws NotFoundException when removing non-existent provider', () => {
      expect(() => registry.remove('NONEXISTENT')).toThrow(NotFoundException);
    });
  });

  describe('getCapable()', () => {
    it('returns providers with the capability', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.register(makeAdapter('B', [MarketplaceCapability.SYNC_INVENTORY]));
      const capable = registry.getCapable(MarketplaceCapability.PUBLISH_LISTING);
      expect(capable.map((a) => a.metadata.providerKey)).toContain('A');
      expect(capable.map((a) => a.metadata.providerKey)).not.toContain('B');
    });

    it('excludes disabled providers', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.disable('A');
      expect(registry.getCapable(MarketplaceCapability.PUBLISH_LISTING)).toHaveLength(0);
    });
  });

  describe('validate()', () => {
    it('returns true for valid provider', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      expect(registry.validate('AMAZON_SP')).toBe(true);
    });

    it('returns false for unregistered provider', () => {
      expect(registry.validate('NONEXISTENT')).toBe(false);
    });
  });

  describe('discover()', () => {
    it('returns all registered providers', () => {
      registry.register(makeAdapter('A'));
      registry.register(makeAdapter('B'));
      expect(registry.discover()).toHaveLength(2);
    });
  });
});
