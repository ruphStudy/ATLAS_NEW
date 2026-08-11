import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { MarketplaceProviderFactoryService } from '../marketplace-provider-factory.service';
import { MarketplaceProviderInstanceResolver } from '../resolver/marketplace-provider-instance.resolver';
import { MarketplaceProviderInstanceCache } from '../cache/marketplace-provider-instance.cache';
import { MarketplaceProviderFactoryMetrics } from '../metrics/marketplace-provider-factory.metrics';
import { MarketplaceProviderFactoryValidator } from '../validator/marketplace-provider-factory.validator';
import { MarketplaceProviderFactoryEventQueue } from '../events/marketplace-provider-factory-events.queue';
import { MarketplaceProviderFactoryErrorNormalizer } from '../errors/marketplace-provider-factory.error-normalizer';
import {
  ProviderFactoryEvent,
  ProviderFactoryRequest,
  ProviderInstance,
  ProviderInstanceState,
} from '../interfaces';
import { MarketplaceCapability } from '../../marketplace-provider/interfaces';

// ── Helpers ───────────────────────────────────────────────────

function makeRequest(overrides?: Partial<ProviderFactoryRequest>): ProviderFactoryRequest {
  return {
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    accountId: 'acct-1',
    ...overrides,
  };
}

function makeInstance(overrides?: Partial<ProviderInstance>): ProviderInstance {
  return {
    instanceId: 'inst-1',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    accountId: 'acct-1',
    state: ProviderInstanceState.READY,
    adapter: { metadata: { providerKey: 'AMAZON_SP', requiresCredentials: true } } as never,
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

// ── Module setup ──────────────────────────────────────────────

describe('MarketplaceProviderFactoryService', () => {
  let service: MarketplaceProviderFactoryService;
  let resolver: jest.Mocked<MarketplaceProviderInstanceResolver>;
  let cache: jest.Mocked<MarketplaceProviderInstanceCache>;
  let metrics: MarketplaceProviderFactoryMetrics;
  let validator: jest.Mocked<MarketplaceProviderFactoryValidator>;
  let eventQueue: jest.Mocked<MarketplaceProviderFactoryEventQueue>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceProviderFactoryService,
        {
          provide: MarketplaceProviderInstanceResolver,
          useValue: {
            resolve: jest.fn(),
            resolveAll: jest.fn(),
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
          useValue: {
            validate: jest.fn().mockReturnValue({ valid: true, errors: [], warnings: [] }),
            validateCredentialState: jest.fn(),
          },
        },
        {
          provide: MarketplaceProviderFactoryEventQueue,
          useValue: { enqueue: jest.fn().mockResolvedValue(undefined) },
        },
        MarketplaceProviderFactoryErrorNormalizer,
      ],
    }).compile();

    service = module.get(MarketplaceProviderFactoryService);
    resolver = module.get(MarketplaceProviderInstanceResolver) as jest.Mocked<MarketplaceProviderInstanceResolver>;
    cache = module.get(MarketplaceProviderInstanceCache) as jest.Mocked<MarketplaceProviderInstanceCache>;
    metrics = module.get(MarketplaceProviderFactoryMetrics);
    validator = module.get(MarketplaceProviderFactoryValidator) as jest.Mocked<MarketplaceProviderFactoryValidator>;
    eventQueue = module.get(MarketplaceProviderFactoryEventQueue) as jest.Mocked<MarketplaceProviderFactoryEventQueue>;
  });

  // ── resolve() ────────────────────────────────────────────

  describe('resolve()', () => {
    it('returns a resolution result on success', async () => {
      const instance = makeInstance();
      resolver.resolve.mockResolvedValue({ instance, cacheHit: false, fallbackUsed: false, resolutionTimeMs: 10 });

      const result = await service.resolve(makeRequest());
      expect(result.instance.instanceId).toBe('inst-1');
      expect(result.cacheHit).toBe(false);
      expect(resolver.resolve).toHaveBeenCalledTimes(1);
    });

    it('throws BadRequestException when validation fails', async () => {
      validator.validate.mockReturnValue({ valid: false, errors: ['workspaceId is required'], warnings: [] });

      await expect(service.resolve(makeRequest({ workspaceId: '' }))).rejects.toThrow(BadRequestException);
      expect(resolver.resolve).not.toHaveBeenCalled();
    });

    it('propagates resolution errors after wrapping', async () => {
      resolver.resolve.mockRejectedValue(new Error('Provider not registered'));

      await expect(service.resolve(makeRequest())).rejects.toThrow();
    });

    it('logs validation warnings without failing', async () => {
      validator.validate.mockReturnValue({ valid: true, errors: [], warnings: ['Provider is in MAINTENANCE state'] });
      const instance = makeInstance();
      resolver.resolve.mockResolvedValue({ instance, cacheHit: false, fallbackUsed: false, resolutionTimeMs: 5 });

      const result = await service.resolve(makeRequest());
      expect(result).toBeDefined();
    });
  });

  // ── refresh() ────────────────────────────────────────────

  describe('refresh()', () => {
    it('forces fresh creation and emits REFRESHED event', async () => {
      const instance = makeInstance();
      resolver.resolve.mockResolvedValue({ instance, cacheHit: false, fallbackUsed: false, resolutionTimeMs: 10 });

      const result = await service.refresh(makeRequest());
      expect(resolver.resolve).toHaveBeenCalledWith(expect.objectContaining({ forceRefresh: true }));
      expect(eventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: ProviderFactoryEvent.REFRESHED }),
      );
      expect(result.instance.instanceId).toBe('inst-1');
    });
  });

  // ── dispose() ────────────────────────────────────────────

  describe('dispose()', () => {
    it('invalidates cache and emits DISPOSED event', async () => {
      await service.dispose('inst-1', 'ws-1', 'AMAZON_SP');

      expect(cache.invalidateByInstanceId).toHaveBeenCalledWith('inst-1');
      expect(cache.updateState).toHaveBeenCalledWith('inst-1', ProviderInstanceState.DISPOSED);
      expect(eventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: ProviderFactoryEvent.DISPOSED }),
      );
    });
  });

  // ── invalidate() ─────────────────────────────────────────

  describe('invalidate()', () => {
    it('delegates to resolver and emits INVALIDATED event when providerKey provided', async () => {
      await service.invalidate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });

      expect(resolver.invalidate).toHaveBeenCalledWith('ws-1', 'AMAZON_SP', undefined);
      expect(eventQueue.enqueue).toHaveBeenCalledWith(
        expect.objectContaining({ event: ProviderFactoryEvent.INVALIDATED }),
      );
    });

    it('does not emit event when no providerKey given', async () => {
      await service.invalidate({ workspaceId: 'ws-1' });

      expect(resolver.invalidate).toHaveBeenCalled();
      expect(eventQueue.enqueue).not.toHaveBeenCalled();
    });
  });

  // ── metrics ───────────────────────────────────────────────

  describe('metrics', () => {
    it('getAggregateMetrics returns zero snapshot initially', () => {
      const snap = service.getAggregateMetrics();
      expect(snap.totalRequests).toBe(0);
      expect(snap.averageInitTimeMs).toBe(0);
    });

    it('resetMetrics clears all data', () => {
      metrics.recordRequest('AMAZON_SP');
      service.resetMetrics();
      expect(service.getAggregateMetrics().totalRequests).toBe(0);
    });
  });
});

// ── MarketplaceProviderFactoryValidator ──────────────────────

describe('MarketplaceProviderFactoryValidator', () => {
  let validator: MarketplaceProviderFactoryValidator;
  const mockRegistry = {
    isRegistered: jest.fn(),
    getStatus: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new MarketplaceProviderFactoryValidator(mockRegistry as never);
  });

  it('fails when workspaceId is missing', () => {
    const result = validator.validate({ workspaceId: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('workspaceId'))).toBe(true);
  });

  it('fails when provider is not registered', () => {
    mockRegistry.isRegistered.mockReturnValue(false);
    const result = validator.validate({ workspaceId: 'ws-1', providerKey: 'UNKNOWN' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('FACTORY_PROVIDER_NOT_FOUND'))).toBe(true);
  });

  it('fails when provider is disabled', () => {
    mockRegistry.isRegistered.mockReturnValue(true);
    mockRegistry.getStatus.mockReturnValue('INACTIVE');
    const result = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('disabled'))).toBe(true);
  });

  it('fails when provider does not support capability', () => {
    mockRegistry.isRegistered.mockReturnValue(true);
    mockRegistry.getStatus.mockReturnValue('ACTIVE');
    mockRegistry.get.mockReturnValue({
      supportsCapability: jest.fn().mockReturnValue(false),
      supportsCountry: jest.fn().mockReturnValue(true),
      supportsRegion: jest.fn().mockReturnValue(true),
    });
    const result = validator.validate({
      workspaceId: 'ws-1',
      providerKey: 'AMAZON_SP',
      capability: MarketplaceCapability.SYNC_INVENTORY,
    });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('FACTORY_UNSUPPORTED_CAPABILITY'))).toBe(true);
  });

  it('warns when provider is in MAINTENANCE state', () => {
    mockRegistry.isRegistered.mockReturnValue(true);
    mockRegistry.getStatus.mockReturnValue('MAINTENANCE');
    mockRegistry.get.mockReturnValue({ supportsCapability: jest.fn().mockReturnValue(true), supportsCountry: jest.fn().mockReturnValue(true), supportsRegion: jest.fn().mockReturnValue(true) });
    const result = validator.validate({ workspaceId: 'ws-1', providerKey: 'AMAZON_SP', capability: MarketplaceCapability.GET_LISTING });
    expect(result.valid).toBe(true);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('passes for valid request', () => {
    mockRegistry.isRegistered.mockReturnValue(true);
    mockRegistry.getStatus.mockReturnValue('ACTIVE');
    mockRegistry.get.mockReturnValue({
      supportsCapability: jest.fn().mockReturnValue(true),
      supportsCountry: jest.fn().mockReturnValue(true),
      supportsRegion: jest.fn().mockReturnValue(true),
    });
    const result = validator.validate({
      workspaceId: 'ws-1',
      providerKey: 'AMAZON_SP',
      capability: MarketplaceCapability.PUBLISH_LISTING,
      country: 'IN',
      region: 'ap-south-1',
    });
    expect(result.valid).toBe(true);
  });
});

// ── MarketplaceProviderInstanceCache ─────────────────────────

describe('MarketplaceProviderInstanceCache', () => {
  let cache: MarketplaceProviderInstanceCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new MarketplaceProviderInstanceCache();
  });

  afterEach(() => jest.useRealTimers());

  it('builds deterministic cache keys', () => {
    expect(
      MarketplaceProviderInstanceCache.buildKey('ws-1', 'AMAZON_SP', 'acct-1', 'IN', 'ap-1', 'v2', 3, 5),
    ).toBe('ws-1:AMAZON_SP:acct-1:IN:ap-1:v2:3:5');
  });

  it('stores and retrieves a READY instance', () => {
    const inst = makeInstance();
    cache.set('k1', inst);
    expect(cache.get('k1')).toBe(inst);
  });

  it('returns null after TTL expires', () => {
    const inst = makeInstance();
    cache.set('k1', inst, 1_000);
    jest.advanceTimersByTime(1_100);
    expect(cache.get('k1')).toBeNull();
  });

  it('returns null for FAILED instance', () => {
    const inst = makeInstance({ state: ProviderInstanceState.FAILED });
    cache.set('k1', inst);
    expect(cache.get('k1')).toBeNull();
  });

  it('returns null for DISPOSED instance', () => {
    const inst = makeInstance({ state: ProviderInstanceState.DISPOSED });
    cache.set('k1', inst);
    expect(cache.get('k1')).toBeNull();
  });

  it('invalidateByProvider removes all matching keys', () => {
    cache.set('ws-1:AMAZON_SP:_:_:_:_:_:_', makeInstance());
    cache.set('ws-2:AMAZON_SP:_:_:_:_:_:_', makeInstance({ workspaceId: 'ws-2' }));
    cache.set('ws-1:FLIPKART:_:_:_:_:_:_', makeInstance({ providerKey: 'FLIPKART' }));

    cache.invalidateByProvider('AMAZON_SP');

    expect(cache.get('ws-1:AMAZON_SP:_:_:_:_:_:_')).toBeNull();
    expect(cache.get('ws-2:AMAZON_SP:_:_:_:_:_:_')).toBeNull();
    expect(cache.get('ws-1:FLIPKART:_:_:_:_:_:_')).not.toBeNull();
  });

  it('updateState removes entry for unusable states', () => {
    const inst = makeInstance({ instanceId: 'X' });
    cache.set('k1', inst);

    cache.updateState('X', ProviderInstanceState.FAILED);
    expect(cache.get('k1')).toBeNull();
  });

  it('evicts oldest when maxEntries is exceeded', () => {
    const tiny = new MarketplaceProviderInstanceCache(2);
    tiny.set('k1', makeInstance({ instanceId: 'a' }));
    tiny.set('k2', makeInstance({ instanceId: 'b' }));
    tiny.set('k3', makeInstance({ instanceId: 'c' }));
    expect(tiny.get('k1')).toBeNull();
    expect(tiny.get('k3')).not.toBeNull();
  });
});

// ── MarketplaceProviderFactoryMetrics ────────────────────────

describe('MarketplaceProviderFactoryMetrics', () => {
  let m: MarketplaceProviderFactoryMetrics;

  beforeEach(() => { m = new MarketplaceProviderFactoryMetrics(); });

  it('starts with zeroed snapshot', () => {
    const snap = m.getForProvider('AMAZON_SP');
    expect(snap.totalRequests).toBe(0);
    expect(snap.averageInitTimeMs).toBe(0);
  });

  it('records requests, hits, misses and init time', () => {
    m.recordRequest('AMAZON_SP');
    m.recordCacheHit('AMAZON_SP');
    m.recordCacheMiss('AMAZON_SP');
    m.recordInitTime('AMAZON_SP', 120);
    m.recordInitTime('AMAZON_SP', 80);

    const snap = m.getForProvider('AMAZON_SP');
    expect(snap.totalRequests).toBe(1);
    expect(snap.cacheHits).toBe(1);
    expect(snap.cacheMisses).toBe(1);
    expect(snap.averageInitTimeMs).toBe(100);
  });

  it('aggregates across providers', () => {
    m.recordRequest('A');
    m.recordRequest('B');
    m.recordInstanceCreated('A');
    m.recordFallbackUsage('B');

    const agg = m.getAggregate();
    expect(agg.totalRequests).toBe(2);
    expect(agg.instancesCreated).toBe(1);
    expect(agg.fallbackUsageCount).toBe(1);
  });

  it('reset clears per-provider data', () => {
    m.recordRequest('AMAZON_SP');
    m.reset('AMAZON_SP');
    expect(m.getForProvider('AMAZON_SP').totalRequests).toBe(0);
  });
});

// ── MarketplaceProviderFactoryErrorNormalizer ────────────────

describe('MarketplaceProviderFactoryErrorNormalizer', () => {
  let n: MarketplaceProviderFactoryErrorNormalizer;

  beforeEach(() => { n = new MarketplaceProviderFactoryErrorNormalizer(); });

  it.each([
    ['not registered', 'FACTORY_PROVIDER_NOT_FOUND', false],
    ['disabled', 'FACTORY_PROVIDER_DISABLED', false],
    ['unsupported capability', 'FACTORY_UNSUPPORTED_CAPABILITY', false],
    ['credential expired', 'FACTORY_CREDENTIALS_EXPIRED', false],
    ['timeout', 'FACTORY_INITIALIZATION_FAILURE', true],
    ['init failure', 'FACTORY_INITIALIZATION_FAILURE', true],
  ])('classifies "%s" correctly', (msg, expectedCode, expectedRetryable) => {
    const result = n.normalize(new Error(msg));
    expect(result.code).toBe(expectedCode);
    expect(result.retryable).toBe(expectedRetryable);
  });

  it('wrap() returns ProviderFactoryException', () => {
    const ex = n.wrap(new Error('not registered'), 'test');
    expect(ex.name).toBe('ProviderFactoryException');
    expect(ex.code).toBe('FACTORY_PROVIDER_NOT_FOUND');
  });
});
