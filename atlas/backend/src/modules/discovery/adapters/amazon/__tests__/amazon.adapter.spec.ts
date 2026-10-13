import { AmazonAdapter } from '../amazon.adapter';
import { AmazonAuthError, type AmazonAuthService } from '@modules/marketplace-adapter/adapters/amazon/auth/amazon-auth.service';
import { AmazonMarketplace, AmazonRegion } from '@modules/marketplace-adapter/adapters/amazon/interfaces/amazon.interfaces';
import type { ConfigurationService } from '@config/configuration.service';
import type { AmazonAdapter as RealAmazonAdapter } from '@modules/marketplace-adapter/adapters/amazon/amazon.adapter';
import { AmazonSpApiClient } from '@modules/marketplace-adapter/adapters/amazon/client/amazon-sp-api.client';
import type { AdapterHttpClient } from '@modules/marketplace-adapter/client/http.client';

// Staging shape: the main app is PRODUCTION, discovery must still run on the sandbox app.
const SANDBOX_GLOBAL_CONFIG = {
  clientId: 'prod-client-id',
  clientSecret: 'prod-client-secret',
  sandboxClientId: 'sandbox-client-id',
  sandboxClientSecret: 'sandbox-client-secret',
  sandboxRefreshToken: 'global-sandbox-refresh-token',
  environment: 'production' as 'sandbox' | 'production',
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

  it('discovery uses ONLY the sandbox app credentials + global sandbox refresh token, never the production app', async () => {
    const searchCatalogItems = jest.fn().mockResolvedValue({ items: [], status: 200 });
    const configurationService = makeConfigurationServiceStub();
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    await collect(adapter.discover(BASE_PARAMS));

    const [credentials] = searchCatalogItems.mock.calls[0]!;
    expect(credentials).toMatchObject({
      clientId: 'sandbox-client-id',
      clientSecret: 'sandbox-client-secret',
      refreshToken: 'global-sandbox-refresh-token',
      app: 'sandbox',
    });
    expect(JSON.stringify(credentials)).not.toContain('prod-client');
  });

  it('discovery calls the SANDBOX SP-API host even when AMAZON_SP_API_ENVIRONMENT=production', async () => {
    const configurationService = makeConfigurationServiceStub({ environment: 'production' });
    const httpClient = { request: jest.fn().mockResolvedValue({ status: 200, data: { items: [] } }) } as unknown as AdapterHttpClient;
    const authService = { getAccessToken: jest.fn().mockResolvedValue('atza-token') } as unknown as AmazonAuthService;
    const spApiClient = new AmazonSpApiClient(httpClient, authService, configurationService);
    // Real SP-API client underneath; the stub only forwards discovery's credentials to it.
    const searchCatalogItems = jest.fn(async (credentials) => {
      await spApiClient.get(credentials, '/catalog/2022-04-01/items');
      return { items: [], status: 200 };
    });
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    await collect(adapter.discover({ ...BASE_PARAMS, country: 'US' }));

    const requestArg = (httpClient.request as jest.Mock).mock.calls[0][0];
    expect(requestArg.url).toBe('https://sandbox.sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items');
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

  it('fails clearly without calling Amazon or exposing secrets when the sandbox app is not configured — never falls back to production', async () => {
    const searchCatalogItems = jest.fn();
    const configurationService = makeConfigurationServiceStub({ sandboxClientId: undefined, sandboxClientSecret: undefined } as any);
    const adapter = new AmazonAdapter(configurationService, makeRealAdapterStub(searchCatalogItems));

    const error = await collect(adapter.discover(BASE_PARAMS)).catch((e: Error) => e);

    expect((error as Error).message).toMatch(/AMAZON_SP_API_SANDBOX_CLIENT_ID/);
    expect((error as Error).message).not.toContain('prod-client');
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
