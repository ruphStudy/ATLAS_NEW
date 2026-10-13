import { AmazonSandboxHealthService } from '../amazon-sandbox-health.service';
import { AmazonAuthError } from '../../auth/amazon-auth.service';
import { AMAZON_API_PATHS } from '../../constants/amazon.constants';

function makeDeps(
  overrides: {
    config?: Partial<{ clientId: string; clientSecret: string; sandboxClientId: string; sandboxClientSecret: string; sandboxRefreshToken: string; environment: string }>;
  } = {},
) {
  const configurationService = {
    getAmazonProviderConfig: jest.fn().mockReturnValue({
      // Production/default app — must never be used by the sandbox check.
      clientId: 'prod-client-id',
      clientSecret: 'prod-client-secret',
      sandboxClientId: 'sandbox-client-id',
      sandboxClientSecret: 'sandbox-client-secret',
      sandboxRefreshToken: 'sandbox-refresh-token',
      environment: 'production',
      ...overrides.config,
    }),
  };
  const authService = { getAccessToken: jest.fn().mockResolvedValue('atza-token') };
  const spApiClient = { get: jest.fn().mockResolvedValue({ status: 200, data: {} }) };

  return { configurationService, authService, spApiClient };
}

function makeService(deps: ReturnType<typeof makeDeps>) {
  return new AmazonSandboxHealthService(deps.configurationService as any, deps.authService as any, deps.spApiClient as any);
}

describe('AmazonSandboxHealthService', () => {
  it('returns healthy and calls the SELLER_INFO sandbox endpoint on success', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('healthy');
    expect(result.endpoint).toBe(AMAZON_API_PATHS.SELLER_INFO);
    expect(typeof result.latencyMs).toBe('number');
    expect(deps.spApiClient.get).toHaveBeenCalledWith(
      expect.objectContaining({ refreshToken: 'sandbox-refresh-token' }),
      AMAZON_API_PATHS.SELLER_INFO,
      undefined,
      expect.any(Object),
      false,
    );
  });

  it('uses ONLY the sandbox app credentials (marked app=sandbox), even when the default app is production', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.checkSandboxConnectivity();
    await service.checkCatalogSearchSandbox();

    for (const call of [...deps.authService.getAccessToken.mock.calls, ...deps.spApiClient.get.mock.calls]) {
      expect(call[0]).toEqual(
        expect.objectContaining({
          clientId: 'sandbox-client-id',
          clientSecret: 'sandbox-client-secret',
          refreshToken: 'sandbox-refresh-token',
          app: 'sandbox',
        }),
      );
      expect(JSON.stringify(call[0])).not.toContain('prod-client');
    }
  });

  it('never includes clientSecret/refreshToken/accessToken in the returned result', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();
    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain('sandbox-client-secret');
    expect(serialized).not.toContain('prod-client-secret');
    expect(serialized).not.toContain('sandbox-refresh-token');
    expect(serialized).not.toContain('atza-token');
  });

  it('runs regardless of AMAZON_SP_API_ENVIRONMENT (production default app does not block the sandbox check)', async () => {
    const deps = makeDeps({ config: { environment: 'production' } });
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('healthy');
  });

  it('fails fast with CONFIG_MISSING when the sandbox app is missing — never falls back to production credentials', async () => {
    const deps = makeDeps({ config: { sandboxClientId: undefined, sandboxClientSecret: undefined } as any });
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('failed');
    expect(result.errorClass).toBe('CONFIG_MISSING');
    expect(result.message).toContain('AMAZON_SP_API_SANDBOX_CLIENT_ID');
    expect(JSON.stringify(result)).not.toContain('prod-client');
    expect(deps.authService.getAccessToken).not.toHaveBeenCalled();
    expect(deps.spApiClient.get).not.toHaveBeenCalled();
  });

  it('fails fast with CONFIG_MISSING when the sandbox refresh token is missing', async () => {
    const deps = makeDeps({ config: { sandboxRefreshToken: undefined } as any });
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('failed');
    expect(result.errorClass).toBe('CONFIG_MISSING');
    expect(deps.authService.getAccessToken).not.toHaveBeenCalled();
  });

  it('classifies a token-exchange failure and returns it without throwing', async () => {
    const deps = makeDeps();
    deps.authService.getAccessToken.mockRejectedValue(new AmazonAuthError('invalid_grant', 'REAUTH_REQUIRED'));
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('failed');
    expect(result.errorClass).toBe('REAUTH_REQUIRED');
  });

  it('classifies a transient SP-API call failure and returns it without throwing', async () => {
    const deps = makeDeps();
    deps.spApiClient.get.mockRejectedValue(new AmazonAuthError('timeout', 'TRANSIENT'));
    const service = makeService(deps);

    const result = await service.checkSandboxConnectivity();

    expect(result.status).toBe('failed');
    expect(result.errorClass).toBe('TRANSIENT');
  });
});
