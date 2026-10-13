import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigurationService } from '@config/configuration.service';
import { MarketplaceAccountService } from '../../../../marketplace-account/marketplace-account.service';
import { MarketplaceAccountRepository } from '../../../../marketplace-account/repository/marketplace-account.repository';
import { AccountStatusManager } from '../../../../marketplace-account/status/account-status.manager';
import { AccountAudit } from '../../../../marketplace-account/audit/account.audit';
import { AccountEventQueue } from '../../../../marketplace-account/events/account-events.queue';
import { AccountEvent, AccountStatus, IMarketplaceAccount } from '../../../../marketplace-account/interfaces';
import { MarketplaceProviderCredentialsService } from '../../../../marketplace-provider-credentials/marketplace-provider-credentials.service';
import { MarketplaceProviderCredentialsManager } from '../../../../marketplace-provider-credentials/marketplace-provider-credentials.manager';
import { AmazonAuthService, AmazonAuthError } from '../auth/amazon-auth.service';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AMAZON_API_PATHS, AMAZON_MARKETPLACE_REGIONS, AMAZON_RATE_LIMITS } from '../constants/amazon.constants';
import { AmazonMarketplace } from '../interfaces/amazon.interfaces';
import { composeAmazonCredentials } from '../amazon-credentials.composer';
import { AmazonOAuthStateSigner } from './amazon-oauth-state.util';
import { buildAmazonAuthorizationUrl, buildAmazonLoginUriRedirectUrl, parseAmazonCallbackUri } from './amazon-oauth-url.builder';

const AMAZON_PROVIDER_KEY = 'AMAZON';

export interface StartAuthorizationParams {
  workspaceId: string;
  userId: string;
  country: string;
  accountId?: string;
}

export interface StartAuthorizationResult {
  authorizationUrl: string;
  expiresAt: Date;
}

export interface ContinueLoginUriParams {
  workspaceId: string;
  userId: string;
  amazonCallbackUri: string;
  amazonState: string;
  sellingPartnerId?: string;
  version?: string;
  /** The state ATLAS issued when this user clicked Connect Amazon (if any) — source of country/accountId. */
  pendingState?: string;
  /** Fallback when no valid pendingState exists (seller started from Amazon's side). */
  country?: string;
  accountId?: string;
}

export interface ContinueLoginUriResult {
  redirectUrl: string;
  expiresAt: Date;
}

export interface AmazonCallbackParams {
  state: string;
  code?: string;
  sellingPartnerId?: string;
  error?: string;
}

export interface AmazonCallbackResult {
  success: boolean;
  reason?: string;
}

/**
 * Orchestrates the Amazon "Connect" OAuth flow end to end: authorization-URL
 * generation, callback validation, token exchange, and persisting the result
 * as a MarketplaceAccount + MarketplaceProviderCredentialRecord.
 *
 * Deliberately does NOT go through MarketplaceAccountService.enableAccount()
 * / MarketplaceConnectionTestService — that path resolves credentials via
 * marketplace-provider's own separate (and, for Amazon, unpopulated) config
 * store, not marketplace-provider-credentials. Verification here is done
 * directly against Amazon (the same SP-API client the rest of the Amazon
 * adapter uses), then the account status is transitioned by hand through the
 * same AccountStatusManager rules enableAccount() itself uses.
 */
@Injectable()
export class AmazonOAuthService {
  private readonly logger = new Logger(AmazonOAuthService.name);

  constructor(
    private readonly stateSigner: AmazonOAuthStateSigner,
    private readonly configurationService: ConfigurationService,
    private readonly authService: AmazonAuthService,
    private readonly spApiClient: AmazonSpApiClient,
    private readonly accountService: MarketplaceAccountService,
    private readonly accountRepository: MarketplaceAccountRepository,
    private readonly statusManager: AccountStatusManager,
    private readonly accountAudit: AccountAudit,
    private readonly accountEventQueue: AccountEventQueue,
    private readonly credentialsService: MarketplaceProviderCredentialsService,
    private readonly credentialsManager: MarketplaceProviderCredentialsManager,
  ) {}

  // ── Ongoing connection use (post-authorization) ─────────────────

  /**
   * Resolves a live Amazon access token for an already-connected seller
   * account — reuses AmazonAuthService's existing in-memory token cache, so
   * this only calls Amazon when the cached token has actually expired.
   *
   * On a definitive Amazon rejection (revoked/invalid refresh token), marks
   * the account EXPIRED (the closest existing status meaning
   * "reauthorization required") and rethrows. On a transient failure
   * (network/5xx/429), leaves the account and credential untouched and
   * rethrows — callers should treat this as retryable, not as "reconnect".
   */
  async getAccessTokenForAccount(workspaceId: string, accountId: string): Promise<string> {
    const account = await this.accountService.findById(accountId, workspaceId);
    if (account.providerKey !== AMAZON_PROVIDER_KEY) {
      throw new BadRequestException(`Account '${accountId}' is not an Amazon account`);
    }
    if (!account.country) {
      throw new BadRequestException(`Account '${accountId}' has no country/marketplace set`);
    }

    const bag = await this.credentialsManager.resolveDecrypted(AMAZON_PROVIDER_KEY, workspaceId, accountId, AMAZON_PROVIDER_KEY);
    if (!bag?.fields?.['refreshToken']) {
      throw new NotFoundException(`No active Amazon credential found for account '${accountId}'`);
    }

    const marketplace = this.resolveMarketplace(account.country);
    const global = this.configurationService.getAmazonProviderConfig();
    const credentials = composeAmazonCredentials(global, {
      refreshToken: bag.fields['refreshToken'],
      sellerId: account.sellerId,
      marketplace,
    });

    try {
      return await this.authService.getAccessToken(credentials);
    } catch (err) {
      if (err instanceof AmazonAuthError && err.classification === 'REAUTH_REQUIRED') {
        await this.markReauthorizationRequired(account, workspaceId, err.message);
      }
      throw err;
    }
  }

  private async markReauthorizationRequired(account: IMarketplaceAccount, workspaceId: string, reason: string): Promise<void> {
    if (!this.statusManager.canTransition(account.status, AccountStatus.EXPIRED)) {
      // Already in a terminal/non-ACTIVE state (e.g. already EXPIRED, or DISABLED by an admin) — nothing to do.
      return;
    }
    const updated = (await this.accountRepository.update(account.id, workspaceId, {
      status: AccountStatus.EXPIRED,
      lastTestedAt: new Date(),
      lastTestSuccess: false,
      updatedBy: null,
    })) as unknown as IMarketplaceAccount;

    await this.accountAudit.log(updated, `status:${account.status}→${AccountStatus.EXPIRED}`, {
      fromStatus: account.status,
      toStatus: AccountStatus.EXPIRED,
      reason,
      changedBy: null,
    });
    await this.accountEventQueue.enqueue({
      // No dedicated AccountEvent.EXPIRED exists — INVALID is the closest
      // existing "needs attention" event; `status` on the payload carries
      // the actual EXPIRED value.
      event: AccountEvent.INVALID,
      accountId: updated.id,
      workspaceId: updated.workspaceId,
      providerKey: updated.providerKey,
      marketplaceKey: updated.marketplaceKey,
      externalAccountId: updated.externalAccountId,
      status: updated.status,
      isDefault: updated.isDefault,
      timestamp: new Date(),
    });
    this.logger.warn(`Amazon account '${account.id}' marked EXPIRED (reauthorization required): ${reason}`);
  }

  // ── Start ─────────────────────────────────────────────────────

  async startAuthorization(params: StartAuthorizationParams): Promise<StartAuthorizationResult> {
    const marketplace = this.resolveMarketplace(params.country);

    if (params.accountId) {
      await this.assertReconnectAccount(params.accountId, params.workspaceId);
    }

    const global = this.configurationService.getAmazonProviderConfig();
    const { state, expiresAt } = this.stateSigner.sign({
      workspaceId: params.workspaceId,
      userId: params.userId,
      country: params.country.toUpperCase(),
      accountId: params.accountId,
    });

    const authorizationUrl = buildAmazonAuthorizationUrl(global, marketplace, state);
    return { authorizationUrl, expiresAt };
  }

  // ── Login URI (website authorization workflow) ────────────────

  /**
   * Continues Amazon's Login URI step for an authenticated ATLAS user:
   * validates `amazon_callback_uri`, resolves country/accountId (from the
   * still-valid state ATLAS issued when this same user clicked Connect
   * Amazon, else from the user's explicit choice), signs a fresh state bound
   * to the session's workspace/user and the reported selling_partner_id, and
   * returns the URL to send the browser back to Amazon.
   */
  async continueLoginUri(params: ContinueLoginUriParams): Promise<ContinueLoginUriResult> {
    const callbackUri = parseAmazonCallbackUri(params.amazonCallbackUri);
    if (!callbackUri) {
      throw new BadRequestException('Invalid amazon_callback_uri');
    }

    let country = params.country;
    let accountId = params.accountId;
    if (params.pendingState) {
      const pending = this.stateSigner.verify(params.pendingState);
      // Only reuse context the same user started in the same workspace.
      if (pending.valid && pending.payload.workspaceId === params.workspaceId && pending.payload.userId === params.userId) {
        country = pending.payload.country;
        accountId = pending.payload.accountId;
      }
    }
    if (!country) {
      throw new BadRequestException('country is required');
    }

    this.resolveMarketplace(country);
    if (accountId) {
      await this.assertReconnectAccount(accountId, params.workspaceId);
    }

    const global = this.configurationService.getAmazonProviderConfig();
    const { state, expiresAt } = this.stateSigner.sign({
      workspaceId: params.workspaceId,
      userId: params.userId,
      country: country.toUpperCase(),
      accountId,
      sellingPartnerId: params.sellingPartnerId,
    });

    const redirectUrl = buildAmazonLoginUriRedirectUrl(global, callbackUri, params.amazonState, state, params.version);
    return { redirectUrl, expiresAt };
  }

  /** Reconnect: the account must exist in this workspace (findById is workspace-scoped) and be Amazon. */
  private async assertReconnectAccount(accountId: string, workspaceId: string): Promise<void> {
    const account = await this.accountService.findById(accountId, workspaceId);
    if (account.providerKey !== AMAZON_PROVIDER_KEY) {
      throw new BadRequestException(`Account '${accountId}' is not an Amazon account`);
    }
  }

  // ── Callback ──────────────────────────────────────────────────

  async handleCallback(params: AmazonCallbackParams): Promise<AmazonCallbackResult> {
    const validation = this.stateSigner.verify(params.state);
    if (!validation.valid) {
      this.logger.warn(`Amazon OAuth callback rejected: invalid state (${validation.reason})`);
      return { success: false, reason: validation.reason.toLowerCase() };
    }
    const { workspaceId, userId, country, accountId: reconnectAccountId, sellingPartnerId: expectedSellerId } = validation.payload;

    if (expectedSellerId && params.sellingPartnerId && expectedSellerId !== params.sellingPartnerId) {
      this.logger.warn(`Amazon OAuth callback rejected: selling_partner_id does not match the Login URI request (workspace ${workspaceId})`);
      return { success: false, reason: 'seller_mismatch' };
    }

    if (params.error) {
      this.logger.warn(`Amazon OAuth callback: seller denied/errored authorization (workspace ${workspaceId}): ${params.error}`);
      return { success: false, reason: 'denied' };
    }
    if (!params.code) {
      this.logger.warn(`Amazon OAuth callback: no authorization code present (workspace ${workspaceId})`);
      return { success: false, reason: 'no_code' };
    }

    let tokenResponse;
    try {
      tokenResponse = await this.authService.exchangeAuthorizationCode(params.code);
    } catch (err) {
      this.logger.warn(`Amazon OAuth callback: token exchange failed (workspace ${workspaceId}): ${(err as Error).message}`);
      return { success: false, reason: 'exchange_failed' };
    }

    const marketplace = this.resolveMarketplace(country);
    const sellerId = params.sellingPartnerId ?? null;

    // Verify the token actually works before persisting/activating anything.
    const verified = await this.verifySellerInfo(tokenResponse.refreshToken, sellerId, marketplace);
    if (!verified) {
      return { success: false, reason: 'verification_failed' };
    }

    try {
      await this.persistAuthorization({
        workspaceId,
        userId,
        country,
        marketplace,
        sellerId,
        refreshToken: tokenResponse.refreshToken,
        reconnectAccountId,
      });
    } catch (err) {
      this.logger.error(`Amazon OAuth callback: failed to persist authorization (workspace ${workspaceId}): ${(err as Error).message}`);
      return { success: false, reason: 'persist_failed' };
    }

    return { success: true };
  }

  // ── Persistence (create/update MarketplaceAccount + credential) ─

  private async persistAuthorization(params: {
    workspaceId: string;
    userId: string;
    country: string;
    marketplace: AmazonMarketplace;
    sellerId: string | null;
    refreshToken: string;
    reconnectAccountId?: string;
  }): Promise<void> {
    const region = this.regionFor(params.marketplace);
    const externalAccountId = params.sellerId ?? `pending-${params.workspaceId}-${params.country}`;

    let account: IMarketplaceAccount;
    const existing = params.reconnectAccountId
      ? await this.accountRepository.findById(params.reconnectAccountId, params.workspaceId).then((r) => r as unknown as IMarketplaceAccount | null)
      : await this.accountRepository
          .findByExternalAccountId(params.workspaceId, AMAZON_PROVIDER_KEY, externalAccountId)
          .then((r) => r as unknown as IMarketplaceAccount | null);

    if (existing) {
      account = await this.accountService.updateAccount(existing.id, params.workspaceId, {
        sellerId: params.sellerId ?? existing.sellerId,
        country: params.country,
        region,
        updatedBy: params.userId,
      });
    } else {
      account = await this.accountService.createAccount({
        workspaceId: params.workspaceId,
        providerKey: AMAZON_PROVIDER_KEY,
        marketplaceKey: AMAZON_PROVIDER_KEY,
        accountName: `Amazon (${params.country.toUpperCase()})`,
        externalAccountId,
        sellerId: params.sellerId,
        country: params.country,
        region,
        createdBy: params.userId,
      });
    }

    // Always create a fresh credential record for the new refreshToken and
    // re-point credentialRef — simpler and safer than trying to force an
    // existing record (possibly REVOKED/EXPIRED, states enable() cannot
    // leave) back to ACTIVE. The superseded record is left as history.
    const credential = await this.credentialsService.create(
      params.workspaceId,
      {
        providerKey: AMAZON_PROVIDER_KEY,
        accountId: account.id,
        marketplaceKey: AMAZON_PROVIDER_KEY,
        credentialSetName: `Amazon SP-API OAuth${params.sellerId ? ` (${params.sellerId})` : ''}`,
        fields: { refreshToken: params.refreshToken },
      },
      params.userId,
    );
    await this.credentialsService.enable(credential.id, params.workspaceId, params.userId);

    await this.activateAccount(account, params.workspaceId, credential.id, params.userId);
  }

  /** Mirrors MarketplaceAccountService.enableAccount()'s status-transition steps, substituting the real Amazon verification already performed for the broken generic connectionTestService call. */
  private async activateAccount(
    account: IMarketplaceAccount,
    workspaceId: string,
    credentialId: string,
    userId: string,
  ): Promise<void> {
    let current = account;
    if (current.status === AccountStatus.DRAFT || current.status === AccountStatus.INVALID || current.status === AccountStatus.EXPIRED) {
      this.statusManager.assertTransition(current.status, AccountStatus.PENDING_VALIDATION);
      current = (await this.accountRepository.update(current.id, workspaceId, {
        status: AccountStatus.PENDING_VALIDATION,
        credentialRef: credentialId,
        updatedBy: userId,
      })) as unknown as IMarketplaceAccount;
    } else {
      await this.accountRepository.update(current.id, workspaceId, { credentialRef: credentialId, updatedBy: userId });
    }

    this.statusManager.assertTransition(AccountStatus.PENDING_VALIDATION, AccountStatus.ACTIVE);
    const active = (await this.accountRepository.update(current.id, workspaceId, {
      status: AccountStatus.ACTIVE,
      lastTestedAt: new Date(),
      lastTestSuccess: true,
      updatedBy: userId,
    })) as unknown as IMarketplaceAccount;

    await this.accountAudit.log(active, AccountEvent.ACTIVATED, {
      fromStatus: current.status,
      toStatus: AccountStatus.ACTIVE,
      changedBy: userId,
    });
    await this.accountEventQueue.enqueue({
      event: AccountEvent.ACTIVATED,
      accountId: active.id,
      workspaceId: active.workspaceId,
      providerKey: active.providerKey,
      marketplaceKey: active.marketplaceKey,
      externalAccountId: active.externalAccountId,
      status: active.status,
      isDefault: active.isDefault,
      timestamp: new Date(),
    });
  }

  // ── Verification ──────────────────────────────────────────────

  private async verifySellerInfo(refreshToken: string, sellerId: string | null, marketplace: AmazonMarketplace): Promise<boolean> {
    try {
      const global = this.configurationService.getAmazonProviderConfig();
      const credentials = composeAmazonCredentials(global, { refreshToken, sellerId, marketplace });
      const response = await this.spApiClient.get(
        credentials,
        AMAZON_API_PATHS.SELLER_INFO,
        undefined,
        AMAZON_RATE_LIMITS.SELLER_INFO,
        false,
      );
      return response.status === 200;
    } catch (err) {
      this.logger.warn(`Amazon OAuth callback: post-authorization verification call failed: ${(err as Error).message}`);
      return false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────

  private resolveMarketplace(country: string): AmazonMarketplace {
    const key = country.toUpperCase() as keyof typeof AmazonMarketplace;
    const marketplace = AmazonMarketplace[key];
    if (!marketplace) {
      throw new BadRequestException(`Unsupported Amazon country '${country}'`);
    }
    return marketplace;
  }

  private regionFor(marketplace: AmazonMarketplace): string {
    return AMAZON_MARKETPLACE_REGIONS[marketplace];
  }
}
