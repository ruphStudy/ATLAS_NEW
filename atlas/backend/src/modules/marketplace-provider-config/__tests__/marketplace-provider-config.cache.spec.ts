import { MarketplaceProviderConfigCache } from '../cache/marketplace-provider-config.cache';
import { IMarketplaceProviderConfig, ConfigurationStatus, ConfigurationScope } from '../interfaces';

function makeConfig(overrides?: Partial<IMarketplaceProviderConfig>): IMarketplaceProviderConfig {
  return {
    id: 'cfg-1',
    providerKey: 'AMAZON_SP',
    workspaceId: 'ws-1',
    scope: ConfigurationScope.WORKSPACE,
    name: 'Test Config',
    status: ConfigurationStatus.PUBLISHED,
    version: 1,
    payload: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MarketplaceProviderConfigCache', () => {
  let cache: MarketplaceProviderConfigCache;

  beforeEach(() => {
    cache = new MarketplaceProviderConfigCache();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('buildKey()', () => {
    it('builds key with all params', () => {
      expect(MarketplaceProviderConfigCache.buildKey('AMAZON', 'ws-1', 'acct-1', 'AMAZON')).toBe('AMAZON:ws-1:acct-1:AMAZON');
    });

    it('builds key with only providerKey', () => {
      expect(MarketplaceProviderConfigCache.buildKey('AMAZON')).toBe('AMAZON');
    });

    it('builds key with providerKey and workspaceId', () => {
      expect(MarketplaceProviderConfigCache.buildKey('AMAZON', 'ws-1')).toBe('AMAZON:ws-1');
    });
  });

  describe('set() and get()', () => {
    it('stores and retrieves a config', () => {
      const cfg = makeConfig();
      cache.set('key-1', cfg);
      expect(cache.get('key-1')).toBe(cfg);
    });

    it('returns null for unknown key', () => {
      expect(cache.get('unknown')).toBeNull();
    });

    it('returns null after TTL expires', () => {
      const cfg = makeConfig();
      cache.set('key-1', cfg, 1_000);
      jest.advanceTimersByTime(1_100);
      expect(cache.get('key-1')).toBeNull();
    });

    it('returns value before TTL expires', () => {
      const cfg = makeConfig();
      cache.set('key-1', cfg, 5_000);
      jest.advanceTimersByTime(4_900);
      expect(cache.get('key-1')).toBe(cfg);
    });
  });

  describe('invalidate()', () => {
    it('removes a single key', () => {
      const cfg = makeConfig();
      cache.set('key-1', cfg);
      cache.invalidate('key-1');
      expect(cache.get('key-1')).toBeNull();
    });

    it('does not throw for non-existent key', () => {
      expect(() => cache.invalidate('missing')).not.toThrow();
    });
  });

  describe('invalidateByProvider()', () => {
    it('removes all entries for a providerKey', () => {
      cache.set('AMAZON:ws-1', makeConfig());
      cache.set('AMAZON:ws-2', makeConfig({ workspaceId: 'ws-2' }));
      cache.set('FLIPKART:ws-1', makeConfig({ providerKey: 'FLIPKART' }));

      cache.invalidateByProvider('AMAZON');

      expect(cache.get('AMAZON:ws-1')).toBeNull();
      expect(cache.get('AMAZON:ws-2')).toBeNull();
      expect(cache.get('FLIPKART:ws-1')).not.toBeNull();
    });
  });

  describe('invalidateByWorkspace()', () => {
    it('removes all entries containing the workspaceId', () => {
      cache.set('AMAZON:ws-1', makeConfig());
      cache.set('FLIPKART:ws-1', makeConfig({ providerKey: 'FLIPKART' }));
      cache.set('AMAZON:ws-2', makeConfig({ workspaceId: 'ws-2' }));

      cache.invalidateByWorkspace('ws-1');

      expect(cache.get('AMAZON:ws-1')).toBeNull();
      expect(cache.get('FLIPKART:ws-1')).toBeNull();
      expect(cache.get('AMAZON:ws-2')).not.toBeNull();
    });
  });

  describe('flush()', () => {
    it('clears all entries', () => {
      cache.set('k1', makeConfig());
      cache.set('k2', makeConfig());
      cache.flush();
      expect(cache.get('k1')).toBeNull();
      expect(cache.get('k2')).toBeNull();
    });
  });
});
