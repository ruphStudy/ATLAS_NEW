import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory.service';
import { MarketplaceProviderInstanceResolver } from '../resolver/marketplace-provider-instance.resolver';
import { MarketplaceProviderInstanceCache } from '../cache/marketplace-provider-instance.cache';
import { MarketplaceProviderFactoryMetrics } from '../metrics/marketplace-provider-factory.metrics';
import { MarketplaceProviderFactoryValidator } from '../validator/marketplace-provider-factory.validator';
import { MarketplaceProviderFactoryEventQueue } from '../events/marketplace-provider-factory-events.queue';
import { MarketplaceProviderFactoryErrorNormalizer, ProviderFactoryException } from '../errors/marketplace-provider-factory.error-normalizer';
import { MarketplaceProviderDependencyResolver } from '../resolver/marketplace-provider-dependency.resolver';
import { MarketplaceProviderInstanceBuilder } from '../builder/marketplace-provider-instance.builder';
import { MarketplaceProviderInitializationManager } from '../initialization/marketplace-provider-initialization.manager';
import { MarketplaceProviderFactory } from '../../marketplace-provider/registry/marketplace-provider.factory';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import {
  ProviderFactoryEvent,
  ProviderFactoryRequest,
  ProviderInstance,
  ProviderInstanceState,
} from '../interfaces';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceHealthStatus,
  MarketplaceProviderStatus,
} from '../../marketplace-provider/interfaces';

// ── Fake adapter ──────────────────────────────────────────────

function makeFakeAdapter(key: string, capabilities: MarketplaceCapability[] = [MarketplaceCapability.PUBLISH_LISTING]): IMarketplaceProviderAdapter {
  return {
    metadata: {
      providerKey: key.toUpperCase(),
      providerName: key,
      displayName: key,
      description: '',
      version: { major: 1, minor: 0, patch: 0 },
      supportedCountries: ['IN', 'US'],
      supportedRegions: ['ap-south-1', 'us-east-1'],
      supportedCurrencies: ['INR', 'USD'],
      supportedLanguages: ['en'],
      supportedMarketplaces: [],
      supportedIntegrationStrategies: [],
      supportedCapabilities: capabilities,
      rateLimitPerMinute: 60,
      timeoutMs: 30_000,
      maxRetries: 3,
      requiresCredentials: false,
      credentialFields: [],
    },
    supportsCapability: (cap) => capabilities.includes(cap),
    supportsCountry: (c) => ['IN', 'US'].includes(c),
    supportsRegion: (r) => ['ap-south-1', 'us-east-1'].includes(r),
    supportsMarketplace: () => true,
    validateCredentials: jest.fn().mockResolvedValue({ valid: true, missing: [], expired: false, errors: [] }),
    testConnection: jest.fn().mockResolvedValue({ providerKey: key, status: MarketplaceHealthStatus.HEALTHY, checkedAt: new Date() }),
    healthCheck: jest.fn().mockResolvedValue({ providerKey: key, status: MarketplaceHealthStatus.HEALTHY, checkedAt: new Date() }),
  };
}

function makeInstance(providerKey = 'AMAZON_SP', overrides?: Partial<ProviderInstance>): ProviderInstance {
  return {
    instanceId: `inst-${providerKey}`,
    workspaceId: 'ws-1',
    providerKey: providerKey.toUpperCase(),
    accountId: 'acct-1',
    state: ProviderInstanceState.READY,
    adapter: makeFakeAdapter(providerKey),
    config: null,
    credential: null,
    configVersion: 1,
    credentialVersion: 1,
    encryptionVersion: 'v1',
    createdAt: new Date(),
    initializedAt: new Date(),
    lastRefreshedAt: null,
    expiresAt: null,
    failureReason: null,
    ...overrides,
  };
}

// ── Integration Suite ─────────────────────────────────────────

describe('MarketplaceProviderFactory — Integration', () => {
  let service: MarketplaceProviderFactoryService;
  let instanceCache: MarketplaceProviderInstanceCache;
  let metrics: MarketplaceProviderFactoryMetrics;
  let fakeEventQueue: { enqueue: jest.Mock; events: Record<string, unknown>[] };

  // Fake resolver: records calls and drives test scenarios
  let resolveImpl: (request: ProviderFactoryRequest) => Promise<{ instance: ProviderInstance; cacheHit: boolean; fallbackUsed: boolean; resolutionTimeMs: number }>;

  beforeEach(async () => {
    fakeEventQueue = { enqueue: jest.fn().mockImplementation((p) => { fakeEventQueue.events.push(p); return Promise.resolve(); }), events: [] };

    resolveImpl = async (request) => {
      const inst = makeInstance(request.providerKey ?? 'AMAZON_SP');
      return { instance: inst, cacheHit: false, fallbackUsed: false, resolutionTimeMs: 5 };
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderFactoryService,
        {
          provide: MarketplaceProviderInstanceResolver,
          useValue: {
            resolve: jest.fn().mockImplementation((req) => resolveImpl(req)),
            resolveAll: jest.fn().mockResolvedValue([]),
            invalidate: jest.fn(),
          },
        },
        {
          provide: MarketplaceProviderInstanceCache,
          useValue: {
            invalidateByInstanceId: jest.fn(),
            updateState: jest.fn(),
            flush: jest.fn(),
          },
        },
        MarketplaceProviderFactoryMetrics,
        {
          provide: MarketplaceProviderFactoryValidator,
          useValue: { validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }) },
        },
        { provide: MarketplaceProviderFactoryEventQueue, useValue: fakeEventQueue },
        MarketplaceProviderFactoryErrorNormalizer,
      ],
    }).compile();

    service = module.get(MarketplaceProviderFactoryService);
    instanceCache = module.get(MarketplaceProviderInstanceCache);
    metrics = module.get(MarketplaceProviderFactoryMetrics);
  });

  // ── Provider resolution ───────────────────────────────────

  it('resolves a provider instance successfully', async () => {
    const result = await service.resolve({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.instance.state).toBe(ProviderInstanceState.READY);
    expect(result.instance.providerKey).toBe('AMAZON_SP');
  });

  it('resolves with fallback when primary fails and fallbackEnabled=true', async () => {
    let callCount = 0;
    resolveImpl = async (request) => {
      callCount++;
      if (callCount === 1 && request.providerKey === 'AMAZON_SP') {
        throw new ProviderFactoryException('FACTORY_PROVIDER_DISABLED', 'Primary disabled', false);
      }
      return { instance: makeInstance(request.providerKey ?? 'FLIPKART'), cacheHit: false, fallbackUsed: true, resolutionTimeMs: 5 };
    };

    const result = await service.resolve({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', fallbackEnabled: true });
    expect(result.instance).toBeDefined();
  });

  it('throws when provider is unknown and no fallback available', async () => {
    resolveImpl = async () => { throw new ProviderFactoryException('FACTORY_PROVIDER_NOT_FOUND', 'Not registered', false); };
    await expect(service.resolve({ workspaceId: 'ws-1', providerKey: 'UNKNOWN' })).rejects.toThrow();
  });

  // ── Cache lifecycle ───────────────────────────────────────

  it('refresh() forces forceRefresh=true', async () => {
    const resolverSpy = jest.spyOn(service['resolver'], 'resolve');
    resolveImpl = async (req) => {
      expect(req.forceRefresh).toBe(true);
      return { instance: makeInstance('AMAZON_SP'), cacheHit: false, fallbackUsed: false, resolutionTimeMs: 5 };
    };

    await service.refresh({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(resolverSpy).toHaveBeenCalled();
  });

  it('dispose() marks instance as DISPOSED and emits event', async () => {
    await service.dispose('inst-X', 'ws-1', 'AMAZON_SP');
    expect(instanceCache.invalidateByInstanceId).toHaveBeenCalledWith('inst-X');
    expect(fakeEventQueue.events.some((e) => (e as { event: string }).event === ProviderFactoryEvent.DISPOSED)).toBe(true);
  });

  it('invalidate() with providerKey emits INVALIDATED event', async () => {
    await service.invalidate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeEventQueue.events.some((e) => (e as { event: string }).event === ProviderFactoryEvent.INVALIDATED)).toBe(true);
  });

  it('invalidate() without providerKey does NOT emit event', async () => {
    await service.invalidate({ workspaceId: 'ws-1' });
    expect(fakeEventQueue.events.some((e) => (e as { event: string }).event === ProviderFactoryEvent.INVALIDATED)).toBe(false);
  });

  // ── Metrics ───────────────────────────────────────────────

  it('getAggregateMetrics aggregates correctly after resolution', async () => {
    metrics.recordRequest('AMAZON_SP');
    metrics.recordCacheHit('AMAZON_SP');
    metrics.recordInstanceCreated('FLIPKART');

    const agg = service.getAggregateMetrics();
    expect(agg.totalRequests).toBe(1);
    expect(agg.cacheHits).toBe(1);
    expect(agg.instancesCreated).toBe(1);
  });

  it('resetMetrics() clears all provider data', () => {
    metrics.recordRequest('AMAZON_SP');
    service.resetMetrics();
    expect(service.getAggregateMetrics().totalRequests).toBe(0);
  });

  // ── Workspace isolation ───────────────────────────────────

  it('resolves separate instances per workspace', async () => {
    const results = await Promise.all([
      service.resolve({ workspaceId: 'ws-A', providerKey: 'AMAZON_SP' }),
      service.resolve({ workspaceId: 'ws-B', providerKey: 'AMAZON_SP' }),
    ]);
    // Both should succeed independently
    expect(results[0]?.instance.workspaceId).toBe('ws-A');
    expect(results[1]?.instance.workspaceId).toBe('ws-B');
  });

  // ── Concurrent initialization ─────────────────────────────

  it('handles concurrent resolution requests without error', async () => {
    const concurrentRequests = Array.from({ length: 5 }, (_, i) =>
      service.resolve({ workspaceId: `ws-${i}`, providerKey: 'AMAZON_SP' }),
    );
    const results = await Promise.all(concurrentRequests);
    expect(results.every((r) => r.instance.state === ProviderInstanceState.READY)).toBe(true);
  });

  // ── Events ────────────────────────────────────────────────

  it('emits REFRESHED event on refresh()', async () => {
    await service.refresh({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(fakeEventQueue.events.some((e) => (e as { event: string }).event === ProviderFactoryEvent.REFRESHED)).toBe(true);
  });
});
