import axios from 'axios';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import { AmazonMarketplace, AmazonRegion } from '../interfaces/amazon.interfaces';
import type { ConfigurationService } from '@config/configuration.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

function makeConfigurationServiceStub(): ConfigurationService {
  return {
    getAmazonProviderConfig: jest.fn().mockReturnValue({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      environment: 'sandbox',
    }),
  } as unknown as ConfigurationService;
}

describe('AmazonAuthService', () => {
  let configurationService: ConfigurationService;
  let service: AmazonAuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    configurationService = makeConfigurationServiceStub();
    service = new AmazonAuthService(configurationService);
    mockedAxios.post.mockResolvedValue({
      data: {
        access_token: 'atza-token',
        refresh_token: 'unchanged-refresh-token',
        token_type: 'bearer',
        expires_in: 3600,
      },
    });
  });

  it('sources client_id/client_secret from ConfigurationService, never from the passed credentials object', async () => {
    await service.refreshAccessToken({
      // Deliberately wrong per-account values, proving they are ignored.
      clientId: 'WRONG-per-account-client-id',
      clientSecret: 'WRONG-per-account-client-secret',
      refreshToken: 'seller-refresh-token',
      sellerId: 'SELLER-1',
      marketplace: AmazonMarketplace.US,
      region: AmazonRegion.NA,
    });

    expect(configurationService.getAmazonProviderConfig).toHaveBeenCalled();
    expect(mockedAxios.post).toHaveBeenCalledTimes(1);

    const [, body] = mockedAxios.post.mock.calls[0] as [string, URLSearchParams];
    expect(body.get('client_id')).toBe('global-client-id');
    expect(body.get('client_secret')).toBe('global-client-secret');
    expect(body.get('refresh_token')).toBe('seller-refresh-token');
    expect(body.get('client_id')).not.toBe('WRONG-per-account-client-id');
    expect(body.get('client_secret')).not.toBe('WRONG-per-account-client-secret');
  });

  it('throws a clear error instead of calling Amazon when global credentials are not configured', async () => {
    (configurationService.getAmazonProviderConfig as jest.Mock).mockReturnValue({
      environment: 'sandbox',
    });

    await expect(
      service.refreshAccessToken({
        clientId: '',
        clientSecret: '',
        refreshToken: 'seller-refresh-token',
        sellerId: 'SELLER-1',
        marketplace: AmazonMarketplace.US,
        region: AmazonRegion.NA,
      }),
    ).rejects.toThrow(/AMAZON_SP_API_CLIENT_ID/);

    expect(mockedAxios.post).not.toHaveBeenCalled();
  });
});
