import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceHealthMonitor } from '../health/marketplace-health.monitor';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceHealthStatus,
  MarketplaceKey,
} from '../interfaces';

function makeHealthyAdapter(providerKey: string): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey,
      providerName: providerKey,
      displayName: providerKey,
      description: '',
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: ['US'],
      supportedRegions: [],
      supportedCurrencies: ['USD'],
      supportedLanguages: ['en'],
      supportedMarketplaces: [MarketplaceKey.AMAZON],
      supportedIntegrationStrategies: [],
      supportedCapabilities: [MarketplaceCapability.HEALTH_CHECK],
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: false,
      credentialFields: [],
    },
    supportsCapability: () => true,
    supportsCountry: () => true,
    supportsRegion: () => true,
    supportsMarketplace: () => true,
    validateCredentials: jest.fn(),
    testConnection: jest.fn(),
    healthCheck: jest.fn().mockResolvedValue({
      providerKey,
      status: MarketplaceHealthStatus.HEALTHY,
      latencyMs: 50,
      checkedAt: new Date(),
    }),
  };
}

function makeUnhealthyAdapter(providerKey: string): IMarketplaceProviderAdapter {
  return {
    ...makeHealthyAdapter(providerKey),
    healthCheck: jest.fn().mockRejectedValue(new Error('Connection refused')),
  };
}

describe('MarketplaceHealthMonitor', () => {
  let monitor: MarketplaceHealthMonitor;
  let registry: MarketplaceProviderRegistry;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MarketplaceProviderRegistry, MarketplaceHealthMonitor],
    }).compile();
    registry = module.get<MarketplaceProviderRegistry>(MarketplaceProviderRegistry);
    monitor = module.get<MarketplaceHealthMonitor>(MarketplaceHealthMonitor);
  });

  describe('checkAll()', () => {
    it('checks all registered active providers', async () => {
      registry.register(makeHealthyAdapter('A'));
      registry.register(makeHealthyAdapter('B'));
      const results = await monitor.checkAll();
      expect(results).toHaveLength(2);
    });

    it('handles failed health checks gracefully', async () => {
      registry.register(makeUnhealthyAdapter('BROKEN'));
      const results = await monitor.checkAll();
      expect(results[0]!.result.status).toBe(MarketplaceHealthStatus.UNHEALTHY);
    });
  });

  describe('checkOne()', () => {
    it('caches the health result', async () => {
      const adapter = makeHealthyAdapter('AMAZON_SP');
      registry.register(adapter);
      await monitor.checkOne(adapter);
      const cached = monitor.getHealth('AMAZON_SP');
      expect(cached?.status).toBe(MarketplaceHealthStatus.HEALTHY);
    });

    it('caches UNHEALTHY on thrown error', async () => {
      const adapter = makeUnhealthyAdapter('BROKEN');
      registry.register(adapter);
      await monitor.checkOne(adapter);
      expect(monitor.getHealth('BROKEN')?.status).toBe(MarketplaceHealthStatus.UNHEALTHY);
    });
  });

  describe('getHealth()', () => {
    it('returns null when not yet checked', () => {
      expect(monitor.getHealth('UNKNOWN')).toBeNull();
    });
  });

  describe('isHealthy()', () => {
    it('returns true for HEALTHY provider', async () => {
      const adapter = makeHealthyAdapter('OK');
      await monitor.checkOne(adapter);
      expect(monitor.isHealthy('OK')).toBe(true);
    });

    it('returns true for unknown provider (optimistic)', () => {
      expect(monitor.isHealthy('UNKNOWN')).toBe(true);
    });

    it('returns false for UNHEALTHY provider', async () => {
      const adapter = makeUnhealthyAdapter('BAD');
      await monitor.checkOne(adapter);
      expect(monitor.isHealthy('BAD')).toBe(false);
    });
  });

  describe('metrics', () => {
    it('tracks failure rate', async () => {
      const adapter = makeUnhealthyAdapter('FAILSOME');
      registry.register(adapter);
      await monitor.checkOne(adapter);
      await monitor.checkOne(adapter);
      expect(monitor.getFailureRate('FAILSOME')).toBe(1);
    });

    it('tracks average latency for healthy checks', async () => {
      const adapter = makeHealthyAdapter('FAST');
      registry.register(adapter);
      await monitor.checkOne(adapter);
      expect(monitor.getAverageLatency('FAST')).toBeGreaterThan(0);
    });
  });

  describe('invalidate()', () => {
    it('clears cached health for provider', async () => {
      const adapter = makeHealthyAdapter('RESET');
      await monitor.checkOne(adapter);
      monitor.invalidate('RESET');
      expect(monitor.getHealth('RESET')).toBeNull();
    });
  });
});
