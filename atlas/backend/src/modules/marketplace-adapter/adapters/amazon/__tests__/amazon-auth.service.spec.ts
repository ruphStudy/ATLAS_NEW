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

  describe('production vs sandbox LWA app', () => {
    const SELLER = {
      clientId: '',
      clientSecret: '',
      refreshToken: 'seller-refresh-token',
      sellerId: 'SELLER-1',
      marketplace: AmazonMarketplace.US,
      region: AmazonRegion.NA,
    };

    beforeEach(() => {
      (configurationService.getAmazonProviderConfig as jest.Mock).mockReturnValue({
        clientId: 'prod-client-id',
        clientSecret: 'prod-client-secret',
        sandboxClientId: 'sandbox-client-id',
        sandboxClientSecret: 'sandbox-client-secret',
        environment: 'production',
      });
    });

    it('seller runtime refresh uses the production/default app', async () => {
      await service.refreshAccessToken(SELLER);

      const [, body] = mockedAxios.post.mock.calls[0] as [string, URLSearchParams];
      expect(body.get('client_id')).toBe('prod-client-id');
      expect(body.get('client_secret')).toBe('prod-client-secret');
    });

    it('authorization-code exchange (OAuth callback) uses the production/default app', async () => {
      mockedAxios.post.mockResolvedValue({
        data: { access_token: 'atza', refresh_token: 'new-refresh', token_type: 'bearer', expires_in: 3600 },
      });

      await service.exchangeAuthorizationCode('spapi-code');

      const [, body] = mockedAxios.post.mock.calls[0] as [string, URLSearchParams];
      expect(body.get('client_id')).toBe('prod-client-id');
      expect(body.get('client_secret')).toBe('prod-client-secret');
    });

    it('sandbox-health credentials (app=sandbox) use only the sandbox app', async () => {
      await service.refreshAccessToken({ ...SELLER, sellerId: '', app: 'sandbox' });

      const [, body] = mockedAxios.post.mock.calls[0] as [string, URLSearchParams];
      expect(body.get('client_id')).toBe('sandbox-client-id');
      expect(body.get('client_secret')).toBe('sandbox-client-secret');
    });

    it('never serves a cached sandbox token to a seller with the same (empty) sellerId/marketplace', async () => {
      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'sandbox-token', token_type: 'bearer', expires_in: 3600 } })
        .mockResolvedValueOnce({ data: { access_token: 'seller-token', token_type: 'bearer', expires_in: 3600 } });

      await expect(service.getAccessToken({ ...SELLER, sellerId: '', app: 'sandbox' })).resolves.toBe('sandbox-token');
      await expect(service.getAccessToken({ ...SELLER, sellerId: '' })).resolves.toBe('seller-token');
    });

    it('fails without calling Amazon or exposing any secret when the sandbox app is missing', async () => {
      (configurationService.getAmazonProviderConfig as jest.Mock).mockReturnValue({
        clientId: 'prod-client-id',
        clientSecret: 'prod-client-secret',
        environment: 'production',
      });

      const error = await service.refreshAccessToken({ ...SELLER, app: 'sandbox' }).catch((e: Error) => e);

      expect((error as Error).message).toMatch(/AMAZON_SP_API_SANDBOX_CLIENT_ID/);
      expect((error as Error).message).not.toContain('prod-client');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('does not log client secrets or refresh tokens when Amazon rejects the refresh', async () => {
      const errorSpy = jest.spyOn((service as unknown as { logger: { error: () => void } }).logger, 'error').mockImplementation(() => undefined);
      mockedAxios.post.mockRejectedValue(Object.assign(new Error('Request failed'), { response: { status: 400, data: { error: 'invalid_grant' } } }));

      const error = await service.refreshAccessToken(SELLER).catch((e: Error) => e);

      const logged = JSON.stringify(errorSpy.mock.calls);
      for (const secret of ['prod-client-secret', 'seller-refresh-token']) {
        expect(logged).not.toContain(secret);
        expect((error as Error).message).not.toContain(secret);
      }
      errorSpy.mockRestore();
    });
  });
});
