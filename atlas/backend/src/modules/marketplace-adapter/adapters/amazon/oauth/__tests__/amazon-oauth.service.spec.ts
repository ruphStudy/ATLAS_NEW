import { AmazonOAuthService } from '../amazon-oauth.service';
import { AmazonOAuthStateSigner } from '../amazon-oauth-state.util';
import { AccountStatusManager } from '../../../../../marketplace-account/status/account-status.manager';
import { AccountStatus } from '../../../../../marketplace-account/interfaces';
import { AmazonAuthError } from '../../auth/amazon-auth.service';

function makeDeps() {
  const stateSigner = {
    sign: jest.fn().mockReturnValue({ state: 'signed-state', expiresAt: new Date(Date.now() + 600_000) }),
    verify: jest.fn(),
  };
  const configurationService = {
    getAmazonProviderConfig: jest.fn().mockReturnValue({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      applicationId: 'app-id',
      redirectUri: 'https://atlas.example.com/callback',
      environment: 'sandbox',
    }),
    getAppConfig: jest.fn().mockReturnValue({ corsOrigins: ['http://localhost:3000'] }),
  };
  const authService = {
    exchangeAuthorizationCode: jest.fn().mockResolvedValue({
      accessToken: 'atza-token',
      refreshToken: 'new-refresh-token',
      tokenType: 'bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600_000),
    }),
    getAccessToken: jest.fn().mockResolvedValue('atza-token'),
  };
  const spApiClient = { get: jest.fn().mockResolvedValue({ status: 200, data: {} }) };
  const accountService = {
    findById: jest.fn(),
    createAccount: jest.fn(),
    updateAccount: jest.fn(),
  };
  const accountRepository = {
    findById: jest.fn().mockResolvedValue(null),
    findByExternalAccountId: jest.fn().mockResolvedValue(null),
    update: jest.fn(),
  };
  const statusManager = new AccountStatusManager();
  const accountAudit = { log: jest.fn().mockResolvedValue(undefined) };
  const accountEventQueue = { enqueue: jest.fn().mockResolvedValue(undefined) };
  const credentialsService = {
    create: jest.fn().mockResolvedValue({ id: 'cred-1' }),
    enable: jest.fn().mockResolvedValue({ id: 'cred-1' }),
  };
  const credentialsManager = { resolveDecrypted: jest.fn() };

  return {
    stateSigner,
    configurationService,
    authService,
    spApiClient,
    accountService,
    accountRepository,
    statusManager,
    accountAudit,
    accountEventQueue,
    credentialsService,
    credentialsManager,
  };
}

function makeService(deps: ReturnType<typeof makeDeps>) {
  return new AmazonOAuthService(
    deps.stateSigner as unknown as AmazonOAuthStateSigner,
    deps.configurationService as any,
    deps.authService as any,
    deps.spApiClient as any,
    deps.accountService as any,
    deps.accountRepository as any,
    deps.statusManager,
    deps.accountAudit as any,
    deps.accountEventQueue as any,
    deps.credentialsService as any,
    deps.credentialsManager as any,
  );
}

const DRAFT_ACCOUNT = {
  id: 'acct-1',
  workspaceId: 'ws-1',
  providerKey: 'AMAZON',
  marketplaceKey: 'AMAZON',
  externalAccountId: 'A1SELLERID',
  sellerId: 'A1SELLERID',
  country: 'US',
  status: AccountStatus.DRAFT,
  isDefault: false,
};

describe('AmazonOAuthService', () => {
  describe('startAuthorization', () => {
    it('builds an authorization URL via the state signer and URL builder', async () => {
      const deps = makeDeps();
      const service = makeService(deps);

      const result = await service.startAuthorization({ workspaceId: 'ws-1', userId: 'user-1', country: 'US' });

      expect(deps.stateSigner.sign).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'ws-1', userId: 'user-1', country: 'US' }),
      );
      expect(result.authorizationUrl).toContain('sellercentral.amazon.com');
      expect(result.authorizationUrl).toContain('state=signed-state');
    });

    it('tenant isolation: a reconnect accountId is resolved only within the caller\'s own workspace', async () => {
      const deps = makeDeps();
      deps.accountService.findById.mockRejectedValue(new Error('not found in this workspace'));
      const service = makeService(deps);

      await expect(
        service.startAuthorization({ workspaceId: 'ws-attacker', userId: 'user-1', country: 'US', accountId: 'acct-victim' }),
      ).rejects.toThrow();

      expect(deps.accountService.findById).toHaveBeenCalledWith('acct-victim', 'ws-attacker');
    });
  });

  describe('handleCallback', () => {
    it('rejects an invalid/tampered state without touching any account', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({ valid: false, reason: 'TAMPERED' });
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 'bad-state' });

      expect(result.success).toBe(false);
      expect(deps.accountService.createAccount).not.toHaveBeenCalled();
      expect(deps.authService.exchangeAuthorizationCode).not.toHaveBeenCalled();
    });

    it('handles Amazon denial/error cleanly', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's', error: 'access_denied' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('denied');
      expect(deps.authService.exchangeAuthorizationCode).not.toHaveBeenCalled();
    });

    it('handles a missing authorization code cleanly', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's' });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('no_code');
    });

    it('on success (new seller): creates a MarketplaceAccount, an ACTIVE credential, links credentialRef, and activates the account', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      deps.accountService.createAccount.mockResolvedValue({ ...DRAFT_ACCOUNT, status: AccountStatus.DRAFT });
      deps.accountRepository.update.mockImplementation((id: string, ws: string, data: any) =>
        Promise.resolve({ ...DRAFT_ACCOUNT, ...data }),
      );
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's', code: 'spapi-code', sellingPartnerId: 'A1SELLERID' });

      expect(result.success).toBe(true);
      expect(deps.accountService.createAccount).toHaveBeenCalledWith(
        expect.objectContaining({ workspaceId: 'ws-1', providerKey: 'AMAZON', sellerId: 'A1SELLERID', country: 'US' }),
      );
      expect(deps.credentialsService.create).toHaveBeenCalledWith(
        'ws-1',
        expect.objectContaining({ providerKey: 'AMAZON', fields: { refreshToken: 'new-refresh-token' } }),
        'user-1',
      );
      expect(deps.credentialsService.enable).toHaveBeenCalledWith('cred-1', 'ws-1', 'user-1');

      const statusUpdates = deps.accountRepository.update.mock.calls.map((c: any[]) => c[2].status);
      expect(statusUpdates).toEqual([AccountStatus.PENDING_VALIDATION, AccountStatus.ACTIVE]);
    });

    it('idempotent reconnect: an existing account (found by externalAccountId) is updated, never duplicated', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      const existingActive = { ...DRAFT_ACCOUNT, status: AccountStatus.EXPIRED };
      deps.accountRepository.findByExternalAccountId.mockResolvedValue(existingActive);
      deps.accountService.updateAccount.mockResolvedValue(existingActive);
      deps.accountRepository.update.mockImplementation((id: string, ws: string, data: any) =>
        Promise.resolve({ ...existingActive, ...data }),
      );
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's', code: 'spapi-code', sellingPartnerId: 'A1SELLERID' });

      expect(result.success).toBe(true);
      expect(deps.accountService.createAccount).not.toHaveBeenCalled();
      expect(deps.accountService.updateAccount).toHaveBeenCalledWith('acct-1', 'ws-1', expect.any(Object));
    });

    it('preserves the existing accountId on an explicit reconnect (state carries accountId)', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', accountId: 'acct-1', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      const existingExpired = { ...DRAFT_ACCOUNT, status: AccountStatus.EXPIRED };
      deps.accountRepository.findById.mockResolvedValue(existingExpired);
      deps.accountService.updateAccount.mockResolvedValue(existingExpired);
      deps.accountRepository.update.mockImplementation((id: string, ws: string, data: any) =>
        Promise.resolve({ ...existingExpired, ...data }),
      );
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's', code: 'spapi-code', sellingPartnerId: 'A1SELLERID' });

      expect(result.success).toBe(true);
      expect(deps.accountRepository.findById).toHaveBeenCalledWith('acct-1', 'ws-1');
      expect(deps.accountService.createAccount).not.toHaveBeenCalled();
    });

    it('a failed post-authorization verification call prevents the account from being activated', async () => {
      const deps = makeDeps();
      deps.stateSigner.verify.mockReturnValue({
        valid: true,
        payload: { workspaceId: 'ws-1', userId: 'user-1', country: 'US', nonce: 'n', iat: 0, exp: Date.now() + 60_000 },
      });
      deps.spApiClient.get.mockRejectedValue(new Error('401 unauthorized'));
      const service = makeService(deps);

      const result = await service.handleCallback({ state: 's', code: 'spapi-code', sellingPartnerId: 'A1SELLERID' });

      expect(result.success).toBe(false);
      expect(result.reason).toBe('verification_failed');
      expect(deps.accountService.createAccount).not.toHaveBeenCalled();
    });
  });

  describe('getAccessTokenForAccount', () => {
    const ACTIVE_ACCOUNT = { ...DRAFT_ACCOUNT, status: AccountStatus.ACTIVE };

    it('returns a token and leaves the account untouched on success', async () => {
      const deps = makeDeps();
      deps.accountService.findById.mockResolvedValue(ACTIVE_ACCOUNT);
      deps.credentialsManager.resolveDecrypted.mockResolvedValue({ fields: { refreshToken: 'rt' } });
      const service = makeService(deps);

      const token = await service.getAccessTokenForAccount('ws-1', 'acct-1');

      expect(token).toBe('atza-token');
      expect(deps.accountRepository.update).not.toHaveBeenCalled();
    });

    it('a transient Amazon failure rethrows WITHOUT marking the account for reauthorization', async () => {
      const deps = makeDeps();
      deps.accountService.findById.mockResolvedValue(ACTIVE_ACCOUNT);
      deps.credentialsManager.resolveDecrypted.mockResolvedValue({ fields: { refreshToken: 'rt' } });
      deps.authService.getAccessToken.mockRejectedValue(new AmazonAuthError('timeout', 'TRANSIENT'));
      const service = makeService(deps);

      await expect(service.getAccessTokenForAccount('ws-1', 'acct-1')).rejects.toThrow();
      expect(deps.accountRepository.update).not.toHaveBeenCalled();
    });

    it('a revoked refresh token marks the account EXPIRED (reauthorization required) and rethrows', async () => {
      const deps = makeDeps();
      deps.accountService.findById.mockResolvedValue(ACTIVE_ACCOUNT);
      deps.credentialsManager.resolveDecrypted.mockResolvedValue({ fields: { refreshToken: 'rt' } });
      deps.authService.getAccessToken.mockRejectedValue(new AmazonAuthError('invalid_grant', 'REAUTH_REQUIRED'));
      deps.accountRepository.update.mockResolvedValue({ ...ACTIVE_ACCOUNT, status: AccountStatus.EXPIRED });
      const service = makeService(deps);

      await expect(service.getAccessTokenForAccount('ws-1', 'acct-1')).rejects.toThrow('invalid_grant');

      expect(deps.accountRepository.update).toHaveBeenCalledWith(
        'acct-1',
        'ws-1',
        expect.objectContaining({ status: AccountStatus.EXPIRED }),
      );
    });
  });
});
