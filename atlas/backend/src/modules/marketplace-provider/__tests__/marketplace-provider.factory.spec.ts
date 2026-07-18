import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceProviderFactory } from '../registry/marketplace-provider.factory';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceHealthStatus,
  WorkspaceMarketplaceProviderConfig,
} from '../interfaces';

function makeAdapter(
  providerKey: string,
  capabilities: MarketplaceCapability[] = [MarketplaceCapability.PUBLISH_LISTING],
  marketplaces: MarketplaceKey[] = [MarketplaceKey.AMAZON],
  countries: string[] = ['US'],
): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey,
      providerName: providerKey,
      displayName: `${providerKey} Adapter`,
      description: '',
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: countries,
      supportedRegions: ['global'],
      supportedCurrencies: ['USD'],
      supportedLanguages: ['en'],
      supportedMarketplaces: marketplaces,
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: false,
      credentialFields: [],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: (c) => countries.includes(c),
    supportsRegion: () => true,
    supportsMarketplace: (mk) => marketplaces.includes(mk),
    validateCredentials: jest.fn(),
    testConnection: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({
      providerKey, status: MarketplaceHealthStatus.HEALTHY, checkedAt: new Date(),
    }),
  };
}

function makeConfig(
  providerKey: string,
  isEnabled = true,
  priority = 50,
): WorkspaceMarketplaceProviderConfig {
  return {
    id: `cfg-${providerKey}`,
    workspaceId: 'ws1',
    providerKey,
    isEnabled,
    priority,
    configuration: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('MarketplaceProviderFactory', () => {
  let factory: MarketplaceProviderFactory;
  let registry: MarketplaceProviderRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceProviderRegistry, MarketplaceProviderFactory],
    }).compile();
    registry = module.get<MarketplaceProviderRegistry>(MarketplaceProviderRegistry);
    factory = module.get<MarketplaceProviderFactory>(MarketplaceProviderFactory);
  });

  describe('select()', () => {
    it('returns the only capable provider', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.PUBLISH_LISTING]));
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
      });
      expect(selected.metadata.providerKey).toBe('A');
    });

    it('prefers the preferred provider key', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.register(makeAdapter('B', [MarketplaceCapability.PUBLISH_LISTING]));
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        preferredProviderKey: 'B',
      });
      expect(selected.metadata.providerKey).toBe('B');
    });

    it('selects by priority from workspace configs', () => {
      registry.register(makeAdapter('LOW_PRIORITY', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.register(makeAdapter('HIGH_PRIORITY', [MarketplaceCapability.PUBLISH_LISTING]));
      const configs = [
        makeConfig('LOW_PRIORITY', true, 100),
        makeConfig('HIGH_PRIORITY', true, 5),
      ];
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        configs,
      });
      expect(selected.metadata.providerKey).toBe('HIGH_PRIORITY');
    });

    it('skips disabled providers', () => {
      registry.register(makeAdapter('DISABLED', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.register(makeAdapter('ENABLED', [MarketplaceCapability.PUBLISH_LISTING]));
      const configs = [
        makeConfig('DISABLED', false),
        makeConfig('ENABLED', true),
      ];
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        configs,
      });
      expect(selected.metadata.providerKey).toBe('ENABLED');
    });

    it('throws if no capable provider available', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.SYNC_INVENTORY]));
      expect(() =>
        factory.select({ workspaceId: 'ws1', capability: MarketplaceCapability.PUBLISH_LISTING }),
      ).toThrow();
    });

    it('filters by country', () => {
      registry.register(makeAdapter('US_ONLY', [MarketplaceCapability.PUBLISH_LISTING], [MarketplaceKey.AMAZON], ['US']));
      registry.register(makeAdapter('IN_ONLY', [MarketplaceCapability.PUBLISH_LISTING], [MarketplaceKey.FLIPKART], ['IN']));
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        country: 'IN',
      });
      expect(selected.metadata.providerKey).toBe('IN_ONLY');
    });

    it('filters by marketplace key', () => {
      registry.register(makeAdapter('AMAZON_PROVIDER', [MarketplaceCapability.PUBLISH_LISTING], [MarketplaceKey.AMAZON]));
      registry.register(makeAdapter('FLIPKART_PROVIDER', [MarketplaceCapability.PUBLISH_LISTING], [MarketplaceKey.FLIPKART]));
      const selected = factory.select({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        marketplaceKey: MarketplaceKey.FLIPKART,
      });
      expect(selected.metadata.providerKey).toBe('FLIPKART_PROVIDER');
    });
  });

  describe('selectAll()', () => {
    it('returns all matching providers ordered by priority', () => {
      registry.register(makeAdapter('A', [MarketplaceCapability.PUBLISH_LISTING]));
      registry.register(makeAdapter('B', [MarketplaceCapability.PUBLISH_LISTING]));
      const configs = [makeConfig('A', true, 20), makeConfig('B', true, 10)];
      const all = factory.selectAll({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
        configs,
      });
      expect(all).toHaveLength(2);
      expect(all[0]!.metadata.providerKey).toBe('B'); // priority 10 first
    });
  });
});
