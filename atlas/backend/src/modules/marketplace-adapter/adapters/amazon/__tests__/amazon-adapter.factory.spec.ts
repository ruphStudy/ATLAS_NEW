import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AmazonAdapterFactory } from '../amazon-adapter.factory';
import { AmazonAdapter } from '../amazon.adapter';
import { AccountStatus } from '../../../../marketplace-account/interfaces';

const ACTIVE_ACCOUNT = {
  id: 'acct-1',
  workspaceId: 'ws-1',
  providerKey: 'AMAZON',
  sellerId: 'A1SELLERID',
  country: 'US',
  status: AccountStatus.ACTIVE,
};

function makeDeps() {
  const accountService = {
    findById: jest.fn().mockResolvedValue(ACTIVE_ACCOUNT),
  };
  const credentialsManager = {
    resolveDecrypted: jest.fn().mockResolvedValue({
      credentialId: 'cred-1',
      workspaceId: 'ws-1',
      providerKey: 'AMAZON',
      fields: { refreshToken: 'refresh-token-1' },
    }),
  };
  const configurationService = {
    getAmazonProviderConfig: jest.fn().mockReturnValue({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      applicationId: 'app-id',
      redirectUri: 'https://atlas.example.com/callback',
      environment: 'sandbox',
    }),
  };
  const spApiClient = { get: jest.fn() };
  const authService = { getAccessToken: jest.fn().mockResolvedValue('atza-token'), clearCache: jest.fn() };
  const requestMapper = {};
  const responseMapper = {};
  const errorMapper = {};
  const eventQueue = { publish: jest.fn().mockResolvedValue(undefined) };
  const responseNormalizer = {};

  return {
    accountService,
    credentialsManager,
    configurationService,
    spApiClient,
    authService,
    requestMapper,
    responseMapper,
    errorMapper,
    eventQueue,
    responseNormalizer,
  };
}

function makeFactory(deps: ReturnType<typeof makeDeps>) {
  return new AmazonAdapterFactory(
    deps.accountService as any,
    deps.credentialsManager as any,
    deps.configurationService as any,
    deps.spApiClient as any,
    deps.authService as any,
    deps.requestMapper as any,
    deps.responseMapper as any,
    deps.errorMapper as any,
    deps.eventQueue as any,
    deps.responseNormalizer as any,
  );
}

describe('AmazonAdapterFactory', () => {
  it('creates a fresh, initialized AmazonAdapter for a valid workspace-scoped account', async () => {
    const deps = makeDeps();
    const factory = makeFactory(deps);

    const adapter = await factory.create('ws-1', 'acct-1');

    expect(adapter).toBeInstanceOf(AmazonAdapter);
    expect(deps.accountService.findById).toHaveBeenCalledWith('acct-1', 'ws-1');
    expect(deps.credentialsManager.resolveDecrypted).toHaveBeenCalledWith(
      'AMAZON',
      'ws-1',
      'acct-1',
      'AMAZON',
    );
    expect(deps.authService.getAccessToken).toHaveBeenCalled();
  });

  it('returns a distinct adapter instance on every call — never a shared singleton across accounts', async () => {
    const deps = makeDeps();
    const factory = makeFactory(deps);

    const first = await factory.create('ws-1', 'acct-1');
    const second = await factory.create('ws-1', 'acct-1');

    expect(first).not.toBe(second);
  });

  it('propagates the workspace-scoped lookup failure — cannot resolve another workspace\'s account', async () => {
    const deps = makeDeps();
    deps.accountService.findById.mockRejectedValue(
      new NotFoundException("Account 'acct-1' not found"),
    );
    const factory = makeFactory(deps);

    await expect(factory.create('ws-attacker', 'acct-1')).rejects.toThrow(NotFoundException);
    expect(deps.credentialsManager.resolveDecrypted).not.toHaveBeenCalled();
  });

  it('rejects an account that is not ACTIVE', async () => {
    const deps = makeDeps();
    deps.accountService.findById.mockResolvedValue({ ...ACTIVE_ACCOUNT, status: AccountStatus.DISABLED });
    const factory = makeFactory(deps);

    await expect(factory.create('ws-1', 'acct-1')).rejects.toThrow(BadRequestException);
    expect(deps.credentialsManager.resolveDecrypted).not.toHaveBeenCalled();
  });

  it('rejects an account belonging to a different provider', async () => {
    const deps = makeDeps();
    deps.accountService.findById.mockResolvedValue({ ...ACTIVE_ACCOUNT, providerKey: 'SHOPIFY' });
    const factory = makeFactory(deps);

    await expect(factory.create('ws-1', 'acct-1')).rejects.toThrow(BadRequestException);
  });

  it('throws when no active Amazon credential can be resolved — never guesses credentials', async () => {
    const deps = makeDeps();
    deps.credentialsManager.resolveDecrypted.mockResolvedValue(null);
    const factory = makeFactory(deps);

    await expect(factory.create('ws-1', 'acct-1')).rejects.toThrow(NotFoundException);
  });

  it('release() destroys the adapter', async () => {
    const deps = makeDeps();
    const factory = makeFactory(deps);
    const adapter = await factory.create('ws-1', 'acct-1');

    const destroySpy = jest.spyOn(adapter, 'destroy');
    await factory.release(adapter);

    expect(destroySpy).toHaveBeenCalled();
  });
});
