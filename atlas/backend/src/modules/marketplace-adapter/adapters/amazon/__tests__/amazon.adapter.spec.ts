import { AmazonAdapter } from '../amazon.adapter';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import { AmazonRequestMapper } from '../mappers/amazon-request.mapper';
import { AmazonResponseMapper } from '../mappers/amazon-response.mapper';
import { AmazonErrorMapper } from '../mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from '../events/amazon-adapter-event.queue';
import { ResponseNormalizer } from '../../../normalizer/response.normalizer';
import { AmazonMarketplace, AmazonRegion } from '../interfaces/amazon.interfaces';
import type { ConfigurationService } from '@config/configuration.service';
import type { IAdapterConfig, IAdapterCredentials } from '../../../interfaces';

function makeConfigurationServiceStub(): ConfigurationService {
  return {
    getAmazonProviderConfig: jest.fn().mockReturnValue({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      environment: 'sandbox',
    }),
  } as unknown as ConfigurationService;
}

describe('AmazonAdapter — runtime credential composition', () => {
  let spApiClient: jest.Mocked<Pick<AmazonSpApiClient, 'get'>>;
  let authService: jest.Mocked<Pick<AmazonAuthService, 'getAccessToken'>>;
  let configurationService: ConfigurationService;
  let adapter: AmazonAdapter;

  const seller: IAdapterCredentials = {
    workspaceId: 'ws-1',
    provider: 'amazon',
    accountId: 'acct-1',
    credentialType: 'OAUTH',
    credentials: {
      refreshToken: 'seller-refresh-token',
      sellerId: 'A1SELLERID',
      marketplace: AmazonMarketplace.US,
    },
  };

  const config: IAdapterConfig = {
    workspaceId: 'ws-1',
    provider: 'amazon',
    accountId: 'acct-1',
  };

  beforeEach(() => {
    spApiClient = { get: jest.fn().mockResolvedValue({ status: 200, data: {} }) };
    authService = { getAccessToken: jest.fn().mockResolvedValue('atza-token') };
    configurationService = makeConfigurationServiceStub();

    adapter = new AmazonAdapter(
      spApiClient as unknown as AmazonSpApiClient,
      authService as unknown as AmazonAuthService,
      {} as AmazonRequestMapper,
      {} as AmazonResponseMapper,
      {} as AmazonErrorMapper,
      { publish: jest.fn() } as unknown as AmazonAdapterEventQueue,
      {} as ResponseNormalizer,
      configurationService,
    );
  });

  it('composes the final runtime credential object from global config + seller authorization, without losing sellerId', async () => {
    await adapter.initialize(config, seller);

    const healthCheck = await adapter.healthCheck();

    // performHealthCheck() reads straight off the composed this.amazonCredentials —
    // proves the final runtime object has global clientId/secret (implicitly, via
    // a successful getAccessToken call) AND retained the seller's own sellerId.
    expect(healthCheck.metadata).toEqual({
      connected: true,
      sellerId: 'A1SELLERID',
      marketplace: AmazonMarketplace.US,
    });
    expect(authService.getAccessToken).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'global-client-id',
        clientSecret: 'global-client-secret',
        refreshToken: 'seller-refresh-token',
        sellerId: 'A1SELLERID',
        marketplace: AmazonMarketplace.US,
        region: AmazonRegion.NA,
      }),
    );
  });

  it('fails initialization clearly when global Amazon config is missing, rather than silently proceeding', async () => {
    (configurationService.getAmazonProviderConfig as jest.Mock).mockReturnValue({ environment: 'sandbox' });

    await expect(adapter.initialize(config, seller)).rejects.toThrow(/AMAZON_SP_API_CLIENT_ID/);
  });
});
