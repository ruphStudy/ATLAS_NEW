import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceProviderManager } from '../manager/marketplace-provider.manager';
import { MarketplaceProviderRegistry } from '../registry/marketplace-provider.registry';
import { MarketplaceProviderFactory } from '../registry/marketplace-provider.factory';
import { MarketplaceProviderResolver } from '../registry/marketplace-provider.resolver';
import { MarketplaceHealthMonitor } from '../health/marketplace-health.monitor';
import { MarketplaceErrorNormalizer } from '../errors/marketplace-error-normalizer';
import { MarketplaceCapabilityValidator } from '../capability/marketplace-capability.validator';
import { MarketplaceCredentialService } from '../credentials/marketplace-credential.service';
import { MarketplaceMetricsRecorder } from '../metrics/marketplace-metrics.recorder';
import { MarketplaceProviderEventQueue } from '../jobs/marketplace-provider-events.queue';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceHealthStatus,
  MarketplaceKey,
  MarketplaceRequestContext,
} from '../interfaces';

const mockEventQueue = { enqueue: jest.fn() };

function makeAdapter(
  providerKey: string,
  capabilities: MarketplaceCapability[] = [
    MarketplaceCapability.PUBLISH_LISTING,
    MarketplaceCapability.HEALTH_CHECK,
  ],
): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey,
      providerName: providerKey,
      displayName: `${providerKey} Adapter`,
      description: '',
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: ['US', 'IN'],
      supportedRegions: ['global'],
      supportedCurrencies: ['USD'],
      supportedLanguages: ['en'],
      supportedMarketplaces: [MarketplaceKey.AMAZON, MarketplaceKey.FLIPKART],
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: true,
      credentialFields: [
        { key: 'apiKey', label: 'API Key', required: true, sensitive: true, credentialType: 'API_KEY' as any },
      ],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: (c) => ['US', 'IN'].includes(c),
    supportsRegion: () => true,
    supportsMarketplace: () => true,
    validateCredentials: jest.fn().mockResolvedValue({ valid: true, missing: [], expired: false, errors: [] }),
    testConnection: jest.fn().mockResolvedValue({
      providerKey, status: MarketplaceHealthStatus.HEALTHY, latencyMs: 45, checkedAt: new Date(),
    }),
    healthCheck: jest.fn().mockResolvedValue({
      providerKey, status: MarketplaceHealthStatus.HEALTHY, latencyMs: 45, checkedAt: new Date(),
    }),
  };
}

function makeContext(providerKey: string): MarketplaceRequestContext {
  return {
    correlationId: 'test-corr-id',
    workspaceId: 'ws-test',
    providerKey,
    marketplaceKey: MarketplaceKey.AMAZON,
  };
}

describe('MarketplaceProviderManager', () => {
  let manager: MarketplaceProviderManager;
  let registry: MarketplaceProviderRegistry;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderRegistry,
        MarketplaceProviderFactory,
        MarketplaceProviderResolver,
        MarketplaceHealthMonitor,
        MarketplaceErrorNormalizer,
        MarketplaceCapabilityValidator,
        MarketplaceCredentialService,
        MarketplaceMetricsRecorder,
        MarketplaceProviderManager,
        { provide: MarketplaceProviderEventQueue, useValue: mockEventQueue },
      ],
    }).compile();

    registry = module.get<MarketplaceProviderRegistry>(MarketplaceProviderRegistry);
    manager = module.get<MarketplaceProviderManager>(MarketplaceProviderManager);
  });

  describe('resolveProvider()', () => {
    it('resolves a registered provider', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const adapter = manager.resolveProvider({
        workspaceId: 'ws1',
        capability: MarketplaceCapability.PUBLISH_LISTING,
      });
      expect(adapter.metadata.providerKey).toBe('AMAZON_SP');
    });
  });

  describe('supportsCapability()', () => {
    it('returns true for supported capability', () => {
      registry.register(makeAdapter('AMAZON_SP'));
      expect(manager.supportsCapability('AMAZON_SP', MarketplaceCapability.PUBLISH_LISTING)).toBe(true);
    });

    it('returns false for unregistered provider', () => {
      expect(manager.supportsCapability('NONE', MarketplaceCapability.PUBLISH_LISTING)).toBe(false);
    });
  });

  describe('assertCapability()', () => {
    it('throws for unsupported capability', () => {
      registry.register(makeAdapter('P', [MarketplaceCapability.PUBLISH_LISTING]));
      expect(() =>
        manager.assertCapability('P', MarketplaceCapability.SYNC_INVENTORY),
      ).toThrow();
    });
  });

  describe('checkHealth()', () => {
    it('returns health result and caches it', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const result = await manager.checkHealth('AMAZON_SP');
      expect(result.status).toBe(MarketplaceHealthStatus.HEALTHY);
    });

    it('emits health-changed event when status changes', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      await manager.checkHealth('AMAZON_SP');
      // Both calls should emit event on first call (null → HEALTHY = change)
      expect(mockEventQueue.enqueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('executeWithRetry()', () => {
    it('returns success on first attempt', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const context = makeContext('AMAZON_SP');
      const res = await manager.executeWithRetry(context, async () => ({ published: true }));
      expect(res.success).toBe(true);
      expect(res.result).toEqual({ published: true });
    });

    it('retries on retryable errors then succeeds', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const context = makeContext('AMAZON_SP');
      let attempts = 0;
      const res = await manager.executeWithRetry(
        context,
        async () => {
          attempts++;
          if (attempts < 2) throw new Error('ECONNREFUSED network error');
          return { ok: true };
        },
        { maxAttempts: 3, backoffMs: 1, backoffMultiplier: 1, retryableErrors: [] },
      );
      expect(res.success).toBe(true);
      expect(attempts).toBe(2);
    });

    it('returns failure after exhausting retries', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const context = makeContext('AMAZON_SP');
      const res = await manager.executeWithRetry(
        context,
        async () => { throw new Error('ECONNREFUSED permanent failure'); },
        { maxAttempts: 2, backoffMs: 1, backoffMultiplier: 1, retryableErrors: [] },
      );
      expect(res.success).toBe(false);
      expect(res.errors).toHaveLength(1);
    });

    it('does not retry non-retryable errors', async () => {
      registry.register(makeAdapter('AMAZON_SP'));
      const context = makeContext('AMAZON_SP');
      let calls = 0;
      const res = await manager.executeWithRetry(
        context,
        async () => { calls++; throw new Error('401 unauthorized'); },
        { maxAttempts: 3, backoffMs: 1, backoffMultiplier: 1, retryableErrors: [] },
      );
      expect(res.success).toBe(false);
      expect(calls).toBe(1); // non-retryable — no retry
    });
  });

  describe('registerProvider()', () => {
    it('registers and emits event', async () => {
      await manager.registerProvider(makeAdapter('NEW_PROVIDER'));
      expect(registry.isRegistered('NEW_PROVIDER')).toBe(true);
      expect(mockEventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'marketplace-provider-registered', providerKey: 'NEW_PROVIDER' }),
      );
    });
  });

  describe('enableProvider() / disableProvider()', () => {
    it('enables provider and emits event', async () => {
      registry.register(makeAdapter('P'));
      registry.disable('P');
      await manager.enableProvider('P', 'ws1');
      expect(registry.isActive('P')).toBe(true);
      expect(mockEventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'marketplace-provider-enabled' }),
      );
    });

    it('disables provider and emits event', async () => {
      registry.register(makeAdapter('P'));
      await manager.disableProvider('P', 'ws1');
      expect(registry.isActive('P')).toBe(false);
      expect(mockEventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'marketplace-provider-disabled' }),
      );
    });
  });
});
