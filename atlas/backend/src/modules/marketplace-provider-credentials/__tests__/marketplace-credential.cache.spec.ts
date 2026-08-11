import { MarketplaceCredentialCache } from '../cache/marketplace-credential.cache';
import { CredentialStatus, CredentialVersionStatus, IMarketplaceProviderCredential } from '../interfaces';

function makeCredential(overrides?: Partial<IMarketplaceProviderCredential>): IMarketplaceProviderCredential {
  return {
    id: 'cred-1',
    workspaceId: 'ws-1',
    providerKey: 'AMAZON_SP',
    credentialSetName: 'default',
    status: CredentialStatus.ACTIVE,
    version: 1,
    versionStatus: CredentialVersionStatus.PUBLISHED,
    encryptedFields: {},
    encryptionVersion: 'v1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('MarketplaceCredentialCache', () => {
  let cache: MarketplaceCredentialCache;

  beforeEach(() => {
    jest.useFakeTimers();
    cache = new MarketplaceCredentialCache();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('buildKey()', () => {
    it('returns provider:workspace for basic case', () => {
      expect(MarketplaceCredentialCache.buildKey('AMAZON', 'ws-1')).toBe('AMAZON:ws-1');
    });

    it('includes accountId when provided', () => {
      expect(MarketplaceCredentialCache.buildKey('AMAZON', 'ws-1', 'acct-1')).toBe('AMAZON:ws-1:acct-1');
    });

    it('includes marketplaceKey when provided', () => {
      expect(MarketplaceCredentialCache.buildKey('AMAZON', 'ws-1', 'acct-1', 'AMAZON')).toBe('AMAZON:ws-1:acct-1:AMAZON');
    });
  });

  describe('set() and get()', () => {
    it('stores and retrieves a credential', () => {
      const cred = makeCredential();
      cache.set('k1', cred);
      expect(cache.get('k1')).toBe(cred);
    });

    it('returns null for unknown key', () => {
      expect(cache.get('unknown')).toBeNull();
    });

    it('returns null after TTL expires', () => {
      cache.set('k1', makeCredential(), 1_000);
      jest.advanceTimersByTime(1_100);
      expect(cache.get('k1')).toBeNull();
    });

    it('returns value before TTL expires', () => {
      cache.set('k1', makeCredential(), 5_000);
      jest.advanceTimersByTime(4_900);
      expect(cache.get('k1')).not.toBeNull();
    });
  });

  describe('invalidate()', () => {
    it('removes by key', () => {
      cache.set('k1', makeCredential());
      cache.invalidate('k1');
      expect(cache.get('k1')).toBeNull();
    });
  });

  describe('invalidateById()', () => {
    it('removes all entries with matching credential id', () => {
      const cred = makeCredential({ id: 'cred-X' });
      cache.set('AMAZON:ws-1', cred);
      cache.set('AMAZON:ws-1:acct-1', cred);
      cache.set('FLIPKART:ws-1', makeCredential({ id: 'other', providerKey: 'FLIPKART' }));

      cache.invalidateById('cred-X');

      expect(cache.get('AMAZON:ws-1')).toBeNull();
      expect(cache.get('AMAZON:ws-1:acct-1')).toBeNull();
      expect(cache.get('FLIPKART:ws-1')).not.toBeNull();
    });
  });

  describe('invalidateByProvider()', () => {
    it('removes all entries starting with providerKey', () => {
      cache.set('AMAZON:ws-1', makeCredential());
      cache.set('AMAZON:ws-2', makeCredential({ workspaceId: 'ws-2' }));
      cache.set('FLIPKART:ws-1', makeCredential({ providerKey: 'FLIPKART' }));

      cache.invalidateByProvider('AMAZON');

      expect(cache.get('AMAZON:ws-1')).toBeNull();
      expect(cache.get('AMAZON:ws-2')).toBeNull();
      expect(cache.get('FLIPKART:ws-1')).not.toBeNull();
    });
  });

  describe('invalidateByWorkspace()', () => {
    it('removes all entries containing the workspaceId', () => {
      cache.set('AMAZON:ws-1', makeCredential());
      cache.set('FLIPKART:ws-1', makeCredential({ providerKey: 'FLIPKART' }));
      cache.set('AMAZON:ws-2', makeCredential({ workspaceId: 'ws-2' }));

      cache.invalidateByWorkspace('ws-1');

      expect(cache.get('AMAZON:ws-1')).toBeNull();
      expect(cache.get('FLIPKART:ws-1')).toBeNull();
      expect(cache.get('AMAZON:ws-2')).not.toBeNull();
    });
  });

  describe('flush()', () => {
    it('clears all entries', () => {
      cache.set('k1', makeCredential());
      cache.set('k2', makeCredential());
      cache.flush();
      expect(cache.size()).toBe(0);
    });
  });

  describe('LRU eviction', () => {
    it('evicts oldest entry when max capacity is reached', () => {
      const tiny = new MarketplaceCredentialCache(2);
      tiny.set('k1', makeCredential({ id: 'c1' }));
      tiny.set('k2', makeCredential({ id: 'c2' }));
      tiny.set('k3', makeCredential({ id: 'c3' })); // should evict k1
      expect(tiny.get('k1')).toBeNull();
      expect(tiny.get('k2')).not.toBeNull();
      expect(tiny.get('k3')).not.toBeNull();
    });
  });
});
