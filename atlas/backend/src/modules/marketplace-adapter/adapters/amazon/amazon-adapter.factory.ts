import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigurationService } from '@config/configuration.service';
import { MarketplaceAccountService } from '../../../marketplace-account/marketplace-account.service';
import { AccountStatus } from '../../../marketplace-account/interfaces';
import { MarketplaceProviderCredentialsManager } from '../../../marketplace-provider-credentials/marketplace-provider-credentials.manager';
import { AmazonAdapter } from './amazon.adapter';
import { AmazonSpApiClient } from './client/amazon-sp-api.client';
import { AmazonAuthService } from './auth/amazon-auth.service';
import { AmazonRequestMapper } from './mappers/amazon-request.mapper';
import { AmazonResponseMapper } from './mappers/amazon-response.mapper';
import { AmazonErrorMapper } from './mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from './events/amazon-adapter-event.queue';
import { ResponseNormalizer } from '../../normalizer/response.normalizer';
import { AmazonMarketplace } from './interfaces/amazon.interfaces';

const AMAZON_PROVIDER_KEY = 'AMAZON';

/**
 * Resolves a real, per-request Amazon seller account + credentials and hands
 * back a freshly constructed, initialized AmazonAdapter bound to exactly that
 * seller. AmazonAdapter is stateful (its write methods read `this.
 * amazonCredentials`), so it must never be reused as a shared singleton
 * across tenants/accounts — every call site must go through create() to get
 * its own instance and call release() (or adapter.destroy()) when done.
 *
 * Credential resolution mirrors AmazonOAuthService.getAccessTokenForAccount()
 * exactly (account lookup → provider/country check → decrypt bag → resolve
 * marketplace) — reused instead of duplicated.
 */
@Injectable()
export class AmazonAdapterFactory {
  private readonly logger = new Logger(AmazonAdapterFactory.name);

  constructor(
    private readonly accountService: MarketplaceAccountService,
    private readonly credentialsManager: MarketplaceProviderCredentialsManager,
    private readonly configurationService: ConfigurationService,
    private readonly spApiClient: AmazonSpApiClient,
    private readonly authService: AmazonAuthService,
    private readonly requestMapper: AmazonRequestMapper,
    private readonly responseMapper: AmazonResponseMapper,
    private readonly errorMapper: AmazonErrorMapper,
    private readonly eventQueue: AmazonAdapterEventQueue,
    private readonly responseNormalizer: ResponseNormalizer,
  ) {}

  /**
   * Resolves `accountId` (must belong to `workspaceId`, be AMAZON, and be
   * ACTIVE) and returns a fresh, initialized AmazonAdapter bound to that
   * seller's real credentials. Throws (never falls back to fake success) if
   * the account, its country, or its credentials cannot be resolved.
   */
  async create(workspaceId: string, accountId: string): Promise<AmazonAdapter> {
    const account = await this.accountService.findById(accountId, workspaceId);

    if (account.providerKey !== AMAZON_PROVIDER_KEY) {
      throw new BadRequestException(`Account '${accountId}' is not an Amazon account`);
    }
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException(
        `Amazon account '${accountId}' is not active (status: ${account.status})`,
      );
    }
    if (!account.country) {
      throw new BadRequestException(`Amazon account '${accountId}' has no country/marketplace set`);
    }

    const bag = await this.credentialsManager.resolveDecrypted(
      AMAZON_PROVIDER_KEY,
      workspaceId,
      accountId,
      AMAZON_PROVIDER_KEY,
    );
    if (!bag?.fields?.['refreshToken']) {
      throw new NotFoundException(`No active Amazon credential found for account '${accountId}'`);
    }

    const marketplace = this.resolveMarketplace(account.country);

    const adapter = new AmazonAdapter(
      this.spApiClient,
      this.authService,
      this.requestMapper,
      this.responseMapper,
      this.errorMapper,
      this.eventQueue,
      this.responseNormalizer,
      this.configurationService,
    );

    await adapter.initialize(
      {
        workspaceId,
        provider: AMAZON_PROVIDER_KEY,
        accountId,
      },
      {
        workspaceId,
        provider: AMAZON_PROVIDER_KEY,
        accountId,
        credentialType: 'oauth',
        credentials: {
          refreshToken: bag.fields['refreshToken'],
          sellerId: account.sellerId,
          marketplace,
        },
      },
    );

    this.logger.log(`Fresh AmazonAdapter created for workspace ${workspaceId}, account ${accountId}`);
    return adapter;
  }

  /** Always call once the adapter is no longer needed for this request. */
  async release(adapter: AmazonAdapter): Promise<void> {
    await adapter.destroy();
  }

  private resolveMarketplace(country: string): AmazonMarketplace {
    const key = country.toUpperCase() as keyof typeof AmazonMarketplace;
    const marketplace = AmazonMarketplace[key];
    if (!marketplace) {
      throw new BadRequestException(`Unsupported Amazon country '${country}'`);
    }
    return marketplace;
  }
}
