import { AmazonAdapter } from '../amazon.adapter';
import { AmazonAuthError } from '@modules/marketplace-adapter/adapters/amazon/auth/amazon-auth.service';
import { AmazonMarketplace, AmazonRegion } from '@modules/marketplace-adapter/adapters/amazon/interfaces/amazon.interfaces';
import type { ConfigurationService } from '@config/configuration.service';
import type { AmazonAdapter as RealAmazonAdapter } from '@modules/marketplace-adapter/adapters/amazon/amazon.adapter';

const SANDBOX_GLOBAL_CONFIG = {
  clientId: 'global-client-id',
  clientSecret: 'global-client-secret',
  sandboxRefreshToken: 'global-sandbox-refresh-token',
  environment: 'sandbox' as const,
};

function makeConfigurationServiceStub(overrides: Partial<typeof SANDBOX_GLOBAL_CONFIG> = {}) {
  return {
    getAmazonProviderConfig: jest.fn().mockReturnValue({ ...SANDBOX_GLOBAL_CONFIG, ...overrides }),
  } as unknown as ConfigurationService;
}

function makeRealAdapterStub(searchCatalogItems: jest.Mock) {
  return { searchCatalogItems } as unknown as RealAmazonAdapter;
}

async function collect<T>(iterable: AsyncIterable<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const item of iterable) out.push(item);
  return out;
}

const BASE_PARAMS = { keywords: ['wireless earbuds'], country: 'IN', categories: undefined, workspaceId: 'ws-1' };

describe('Discovery AmazonAdapter — real Amazon Catalog Items integration', () => {
  it('uses the real Amazon infrastructure (searchCatalogItems), not synthetic generation', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B000TEST01', summaries: [{ itemName: 'Real Title', brand: 'RealBrand' }] }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const results = await collect(adapter.discover(BASE_PARAMS));

    expect(searchCatalogItems).toHaveBeenCalledTimes(1);
    expect(results[0]?.title).toBe('Real Title');
    expect(results[0]?.rawData['source']).toBe('amazon_sp_api_catalog_items');
  });

  it('passes the discovery keyword through to Catalog Items keywords', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    await collect(adapter.discover({ ...BASE_PARAMS, keywords: ['yoga mat'] }));

    expect(searchCatalogItems).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ keywords: ['yoga mat'] }));
  });

  it('resolves the correct Amazon marketplaceId for the discovery country (India)', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    await collect(adapter.discover({ ...BASE_PARAMS, country: 'IN' }));

    const [credentials] = searchCatalogItems.mock.calls[0]!;
    expect(credentials.marketplace).toBe(AmazonMarketplace.IN);
    expect(credentials.region).toBe(AmazonRegion.EU);
  });

  it('sandbox discovery uses the GLOBAL sandbox refresh token + global clientId/clientSecret', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [], status: 200 });
    const configurationService = makeConfigurationServiceStub();
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    await collect(adapter.discover(BASE_PARAMS));

    const [credentials] = searchCatalogItems.mock.calls[0]!;
    expect(credentials).toMatchObject({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      refreshToken: 'global-sandbox-refresh-token',
    });
  });

  it('sandbox discovery requires no MarketplaceAccount — constructor takes only ConfigurationService + the real adapter', async () => {
    // Structural proof: this test constructs the adapter with exactly two
    // dependencies and no account/credential-record lookup of any kind, yet
    // discover() completes successfully end to end.
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B1' }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const results = await collect(adapter.discover(BASE_PARAMS));
    expect(results).toHaveLength(1);
  });

  it('production (AMAZON_SP_API_ENVIRONMENT=production) never uses the sandbox refresh token, and fails clearly instead', async () => {
    const searchCatalogItems = jest.fn();
    const configurationService = makeConfigurationServiceStub({ environment: 'production' as any });
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    await expect(collect(adapter.discover(BASE_PARAMS))).rejects.toThrow(/production/i);
    expect(searchCatalogItems).not.toHaveBeenCalled();
  });

  it('maps a real title from summaries[0].itemName', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B1', summaries: [{ itemName: 'Bluetooth Speaker XL' }] }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    expect(result?.title).toBe('Bluetooth Speaker XL');
  });

  it('preserves the real ASIN in rawData', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B0REALASIN9' }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    expect(result?.rawData['asin']).toBe('B0REALASIN9');
  });

  it('preserves the primary image URL when Amazon returns one', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({
      items: [{ asin: 'B1', images: [{ images: [{ variant: 'MAIN', link: 'https://m.media-amazon.com/images/I/real.jpg' }] }] }],
      status: 200,
    });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    expect(result?.rawData['imageUrl']).toBe('https://m.media-amazon.com/images/I/real.jpg');
  });

  it('preserves brand, productType, and salesRanks when Amazon returns them', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({
      items: [{
        asin: 'B1',
        summaries: [{ itemName: 'Item', brand: 'AcmeBrand' }],
        productTypes: [{ productType: 'SPEAKERS' }],
        salesRanks: [{ rank: 1234, title: 'Electronics' }],
      }],
      status: 200,
    });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    expect(result?.rawData['brand']).toBe('AcmeBrand');
    expect(result?.category).toBe('SPEAKERS');
    expect(result?.rawData['salesRanks']).toEqual([{ rank: 1234, title: 'Electronics' }]);
  });

  it('does not fabricate values for fields Amazon did not return — title falls back to ASIN, scores stay 0 with an explicit disclosure flag', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B0NOSUMMARY' }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    expect(result?.title).toBe('B0NOSUMMARY');
    expect(result?.estimatedDemandScore).toBe(0);
    expect(result?.estimatedCompetitionScore).toBe(0);
    expect(result?.estimatedProfitScore).toBe(0);
    expect(result?.estimatedAiScore).toBe(0);
    expect(result?.rawData['scoringAvailable']).toBe(false);
    expect(result?.rawData['brand']).toBeNull();
    expect(result?.rawData['imageUrl']).toBeNull();
  });

  it('does NOT fall back to synthetic results when the Amazon call fails — the failure propagates', async () => {
    const searchCatalogItems = jest.fn().mockRejectedValue(new AmazonAuthError('invalid_grant', 'REAUTH_REQUIRED'));
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    await expect(collect(adapter.discover(BASE_PARAMS))).rejects.toThrow(/REAUTH_REQUIRED/);
  });

  it('never includes clientSecret/refreshToken in a thrown error message', async () => {
    const searchCatalogItems = jest.fn().mockRejectedValue(new Error('boom'));
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    try {
      await collect(adapter.discover(BASE_PARAMS));
      fail('expected discover() to throw');
    } catch (err) {
      const message = (err as Error).message;
      expect(message).not.toContain('global-client-secret');
      expect(message).not.toContain('global-sandbox-refresh-token');
    }
  });

  it('never includes clientSecret/refreshToken in a yielded product', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [{ asin: 'B1', summaries: [{ itemName: 'T' }] }], status: 200 });
    const adapter = new AmazonAdapter(makeConfigurationServiceStub(), makeRealAdapterStub(searchCatalogItems));

    const [result] = await collect(adapter.discover(BASE_PARAMS));
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('global-client-secret');
    expect(serialized).not.toContain('global-sandbox-refresh-token');
  });

  it('fails clearly when AMAZON_SP_API_SANDBOX_REFRESH_TOKEN is not configured, without calling Amazon', async () => {
    const searchCatalogItems = jest.fn();
    const configurationService = makeConfigurationServiceStub({ sandboxRefreshToken: undefined });
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    await expect(collect(adapter.discover(BASE_PARAMS))).rejects.toThrow(/AMAZON_SP_API_SANDBOX_REFRESH_TOKEN/);
    expect(searchCatalogItems).not.toHaveBeenCalled();
  });
});
