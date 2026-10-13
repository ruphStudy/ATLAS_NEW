import { resolveAmazonSpApiBaseUrl } from '../constants/amazon.constants';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import { AmazonMarketplace, AmazonRegion } from '../interfaces/amazon.interfaces';
import { HttpMethod } from '../../../interfaces';
import type { AdapterHttpClient } from '../../../client/http.client';
import type { ConfigurationService } from '@config/configuration.service';

describe('resolveAmazonSpApiBaseUrl', () => {
  it('resolves sandbox endpoints per region when environment=sandbox', () => {
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.NA, 'sandbox')).toBe(
      'https://sandbox.sellingpartnerapi-na.amazon.com',
    );
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.EU, 'sandbox')).toBe(
      'https://sandbox.sellingpartnerapi-eu.amazon.com',
    );
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.FE, 'sandbox')).toBe(
      'https://sandbox.sellingpartnerapi-fe.amazon.com',
    );
  });

  it('resolves production endpoints per region when environment=production', () => {
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.NA, 'production')).toBe(
      'https://sellingpartnerapi-na.amazon.com',
    );
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.EU, 'production')).toBe(
      'https://sellingpartnerapi-eu.amazon.com',
    );
    expect(resolveAmazonSpApiBaseUrl(AmazonRegion.FE, 'production')).toBe(
      'https://sellingpartnerapi-fe.amazon.com',
    );
  });

  it('never returns the same host for sandbox vs production, for every region', () => {
    for (const region of [AmazonRegion.NA, AmazonRegion.EU, AmazonRegion.FE]) {
      expect(resolveAmazonSpApiBaseUrl(region, 'sandbox')).not.toBe(
        resolveAmazonSpApiBaseUrl(region, 'production'),
      );
    }
  });
});

describe('AmazonSpApiClient environment-driven base URL selection', () => {
  function makeClient(environment: 'sandbox' | 'production') {
    const httpClient = { request: jest.fn().mockResolvedValue({ status: 200, data: {} }) } as unknown as AdapterHttpClient;
    const authService = { getAccessToken: jest.fn().mockResolvedValue('atza-token') } as unknown as AmazonAuthService;
    const configurationService = {
      getAmazonProviderConfig: jest.fn().mockReturnValue({
        clientId: 'global-client-id',
        clientSecret: 'global-client-secret',
        environment,
      }),
    } as unknown as ConfigurationService;

    return { client: new AmazonSpApiClient(httpClient, authService, configurationService), httpClient };
  }

  const credentials = {
    clientId: 'global-client-id',
    clientSecret: 'global-client-secret',
    refreshToken: 'seller-refresh-token',
    sellerId: 'SELLER-1',
    marketplace: AmazonMarketplace.US,
    region: AmazonRegion.NA,
  };

  it('calls the sandbox host when global environment=sandbox', async () => {
    const { client, httpClient } = makeClient('sandbox');
    await client.get(credentials, '/catalog/2022-04-01/items');

    const requestArg = (httpClient.request as jest.Mock).mock.calls[0][0];
    expect(requestArg.url).toBe('https://sandbox.sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items');
  });

  it('calls the production host when global environment=production', async () => {
    const { client, httpClient } = makeClient('production');
    await client.get(credentials, '/catalog/2022-04-01/items');

    const requestArg = (httpClient.request as jest.Mock).mock.calls[0][0];
    expect(requestArg.url).toBe('https://sellingpartnerapi-na.amazon.com/catalog/2022-04-01/items');
  });

  it('always calls the sandbox host for sandbox-health credentials (app=sandbox), even when global environment=production', async () => {
    const { client, httpClient } = makeClient('production');
    await client.get({ ...credentials, app: 'sandbox' as const }, '/sellers/v1/marketplaceParticipations');

    const requestArg = (httpClient.request as jest.Mock).mock.calls[0][0];
    expect(requestArg.url).toBe('https://sandbox.sellingpartnerapi-na.amazon.com/sellers/v1/marketplaceParticipations');
  });
});
