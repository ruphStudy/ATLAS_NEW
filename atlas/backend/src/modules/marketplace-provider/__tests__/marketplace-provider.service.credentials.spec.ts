import { BadRequestException } from '@nestjs/common';
import { MarketplaceProviderService } from '../marketplace-provider.service';
import { MarketplaceCredentialEncryption, MarketplaceCredentialType } from '../interfaces';

function makeDeps() {
  const repository = {
    findActiveConfig: jest.fn().mockResolvedValue(null),
    findMarketplaceAccountCountry: jest.fn().mockResolvedValue(null),
  };
  const credentialService = {
    decrypt: jest.fn().mockReturnValue(JSON.stringify({ apiKey: 'enc-api-key' })),
    decryptCredentials: jest.fn().mockReturnValue({ apiKey: 'plain-api-key' }),
  };
  const manager = { testConnection: jest.fn().mockResolvedValue({ status: 'HEALTHY' }) };
  const providerCredentialsManager = { resolveDecrypted: jest.fn().mockResolvedValue(null) };
  return { repository, credentialService, manager, providerCredentialsManager };
}

function makeService(deps: ReturnType<typeof makeDeps>) {
  return new MarketplaceProviderService(
    {} as any, // registry
    deps.manager as any,
    {} as any, // healthMonitor
    deps.credentialService as any,
    {} as any, // capabilityValidator
    {} as any, // versionManager
    {} as any, // metricsRecorder
    deps.repository as any,
    {} as any, // eventQueue
    {} as any, // auditLogsService
    deps.providerCredentialsManager as any,
  );
}

describe('MarketplaceProviderService.resolveDecryptedCredentials', () => {
  it('legacy provider-config credentials still resolve exactly as before, without consulting the new store', async () => {
    const deps = makeDeps();
    deps.repository.findActiveConfig.mockResolvedValue({
      encryptedCredentials: 'packed',
      credentialType: MarketplaceCredentialType.API_KEY,
      credentialExpiresAt: null,
    });
    const service = makeService(deps);

    const result = await service.resolveDecryptedCredentials('ws-1', 'SHOPIFY', 'acct-1');

    expect(deps.credentialService.decrypt).toHaveBeenCalledWith('packed', 'ws-1', 'SHOPIFY');
    expect(result).toEqual({
      workspaceId: 'ws-1',
      providerKey: 'SHOPIFY',
      accountId: 'acct-1',
      credentialType: MarketplaceCredentialType.API_KEY,
      encryptionAlgorithm: MarketplaceCredentialEncryption.NONE,
      fields: { apiKey: 'plain-api-key' },
      expiresAt: null,
    });
    expect(deps.providerCredentialsManager.resolveDecrypted).not.toHaveBeenCalled();
  });

  it('falls back to marketplace-provider-credentials when the legacy config has no credentials (Amazon OAuth refreshToken)', async () => {
    const deps = makeDeps();
    deps.repository.findActiveConfig.mockResolvedValue({ encryptedCredentials: null });
    deps.providerCredentialsManager.resolveDecrypted.mockResolvedValue({
      credentialId: 'cred-1',
      workspaceId: 'ws-1',
      providerKey: 'AMAZON',
      fields: { refreshToken: 'seller-refresh-token' },
    });
    const service = makeService(deps);

    const result = await service.resolveDecryptedCredentials('ws-1', 'AMAZON', 'acct-1');

    expect(deps.providerCredentialsManager.resolveDecrypted).toHaveBeenCalledWith('AMAZON', 'ws-1', 'acct-1', 'AMAZON');
    expect(result).toEqual({
      workspaceId: 'ws-1',
      providerKey: 'AMAZON',
      accountId: 'acct-1',
      credentialType: MarketplaceCredentialType.OAUTH_TOKEN,
      encryptionAlgorithm: MarketplaceCredentialEncryption.NONE,
      fields: { refreshToken: 'seller-refresh-token' },
      expiresAt: null,
    });
    expect(deps.credentialService.decrypt).not.toHaveBeenCalled();
  });

  it('passes a null accountId to the new store when none is given', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await service.resolveDecryptedCredentials('ws-1', 'AMAZON');

    expect(deps.providerCredentialsManager.resolveDecrypted).toHaveBeenCalledWith('AMAZON', 'ws-1', null, 'AMAZON');
  });

  it('returns null when neither store has credentials', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await expect(service.resolveDecryptedCredentials('ws-1', 'AMAZON', 'acct-1')).resolves.toBeNull();
  });
});

describe('MarketplaceProviderService.testConnection', () => {
  it('no longer fails with "No credentials configured" when a valid OAuth credential exists in the new store', async () => {
    const deps = makeDeps();
    deps.providerCredentialsManager.resolveDecrypted.mockResolvedValue({
      credentialId: 'cred-1',
      workspaceId: 'ws-1',
      providerKey: 'AMAZON',
      fields: { refreshToken: 'seller-refresh-token' },
    });
    const service = makeService(deps);

    await expect(service.testConnection('ws-1', 'AMAZON', 'acct-1')).resolves.toEqual({ status: 'HEALTHY' });
    expect(deps.manager.testConnection).toHaveBeenCalledWith(
      'AMAZON',
      'ws-1',
      'acct-1',
      expect.objectContaining({ fields: { refreshToken: 'seller-refresh-token' } }),
      undefined,
    );
  });

  describe('account country in the connection context', () => {
    function withOAuthCredential() {
      const deps = makeDeps();
      deps.providerCredentialsManager.resolveDecrypted.mockResolvedValue({
        credentialId: 'cred-1',
        workspaceId: 'ws-1',
        providerKey: 'AMAZON',
        fields: { refreshToken: 'seller-refresh-token' },
      });
      return deps;
    }

    it.each(['IN', 'US'])('passes the account country (%s) to the provider manager', async (country) => {
      const deps = withOAuthCredential();
      deps.repository.findMarketplaceAccountCountry.mockResolvedValue(country);
      const service = makeService(deps);

      await service.testConnection('ws-1', 'AMAZON', 'acct-1');

      expect(deps.manager.testConnection).toHaveBeenCalledWith('AMAZON', 'ws-1', 'acct-1', expect.anything(), country);
    });

    it('an account without a country passes no country (adapter default preserved)', async () => {
      const deps = withOAuthCredential();
      const service = makeService(deps);

      await service.testConnection('ws-1', 'AMAZON', 'acct-1');

      expect(deps.manager.testConnection).toHaveBeenCalledWith('AMAZON', 'ws-1', 'acct-1', expect.anything(), undefined);
    });

    it('looks the account up only within the caller workspace, and skips the lookup with no accountId', async () => {
      const deps = withOAuthCredential();
      const service = makeService(deps);

      await service.testConnection('ws-1', 'AMAZON', 'acct-1');
      expect(deps.repository.findMarketplaceAccountCountry).toHaveBeenCalledWith('ws-1', 'acct-1');

      deps.repository.findMarketplaceAccountCountry.mockClear();
      await service.testConnection('ws-1', 'AMAZON');
      expect(deps.repository.findMarketplaceAccountCountry).not.toHaveBeenCalled();
    });
  });

  it('still rejects with "No credentials configured" when neither store has credentials', async () => {
    const deps = makeDeps();
    const service = makeService(deps);

    await expect(service.testConnection('ws-1', 'AMAZON', 'acct-1')).rejects.toThrow(BadRequestException);
    expect(deps.manager.testConnection).not.toHaveBeenCalled();
  });
});
