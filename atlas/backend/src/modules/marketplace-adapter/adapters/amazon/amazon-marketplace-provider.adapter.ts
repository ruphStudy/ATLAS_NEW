import { Injectable } from '@nestjs/common';
import { ConfigurationService } from '@config/configuration.service';
import { AmazonSpApiClient } from './client/amazon-sp-api.client';
import { AmazonMarketplace, AmazonRegion } from './interfaces/amazon.interfaces';
import { AMAZON_API_PATHS, AMAZON_RATE_LIMITS } from './constants/amazon.constants';
import { composeAmazonCredentials } from './amazon-credentials.composer';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceCredentials,
  MarketplaceCredentialType,
  MarketplaceCredentialValidationResult,
  MarketplaceHealthResult,
  MarketplaceHealthStatus,
  MarketplaceIntegrationStrategy,
  MarketplaceKey,
  MarketplaceProviderMetadata,
  MarketplaceRequestContext,
} from '../../../marketplace-provider/interfaces';

// clientId/clientSecret are deliberately NOT here — they come only from
// global ConfigurationService (see amazon-credentials.composer.ts). sellerId
// is deliberately NOT here either — it comes from MarketplaceAccount, not
// from the encrypted per-workspace credential bag.
const REQUIRED_CREDENTIAL_FIELDS = ['refreshToken'] as const;

/**
 * Bridges the real Amazon SP-API infrastructure (AmazonSpApiClient / AmazonAdapter,
 * in this same directory) into the MarketplaceProviderRegistry contract so that
 * MarketplaceProviderFactoryService.resolve({ providerKey: 'AMAZON' }) can find it.
 *
 * This does not duplicate the Amazon integration — it declares metadata for the
 * existing SP-API client/paths and, for testConnection, calls that same client
 * directly (stateless per-call, unlike AmazonAdapter.getCatalog() which requires
 * BaseAdapter.initialize() to have been run first — that per-request initialization
 * is not wired here yet).
 */
@Injectable()
export class AmazonMarketplaceProviderAdapter implements IMarketplaceProviderAdapter {
  constructor(
    private readonly spApiClient: AmazonSpApiClient,
    private readonly configurationService: ConfigurationService,
  ) {}

  readonly metadata: MarketplaceProviderMetadata = {
    providerKey: 'AMAZON',
    providerName: 'amazon',
    displayName: 'Amazon',
    description: 'Amazon Selling Partner API (SP-API) marketplace provider',
    version: { major: 1, minor: 0, patch: 0 },
    supportedCountries: Object.keys(AmazonMarketplace),
    supportedRegions: Object.values(AmazonRegion),
    supportedCurrencies: ['USD', 'CAD', 'MXN', 'BRL', 'GBP', 'EUR', 'SEK', 'PLN', 'TRY', 'AED', 'INR', 'SGD', 'AUD', 'JPY'],
    supportedLanguages: ['en'],
    supportedMarketplaces: [MarketplaceKey.AMAZON],
    supportedIntegrationStrategies: [
      MarketplaceIntegrationStrategy.REST_POLLING,
      MarketplaceIntegrationStrategy.WEBHOOK,
    ],
    // Mirrors exactly what AmazonAdapter.getCapabilities() declares in
    // amazon.adapter.ts — UPDATE_CATALOG is deliberately excluded because
    // AmazonAdapter.updateCatalog() returns an explicit "not supported" error.
    supportedCapabilities: [
      MarketplaceCapability.GET_CATALOG,
      MarketplaceCapability.GET_INVENTORY,
      MarketplaceCapability.UPDATE_INVENTORY,
      MarketplaceCapability.GET_LISTING,
      MarketplaceCapability.PUBLISH_LISTING,
      MarketplaceCapability.UPDATE_LISTING,
      MarketplaceCapability.DELETE_LISTING,
      MarketplaceCapability.GET_ORDER,
      MarketplaceCapability.GET_SHIPMENT,
      MarketplaceCapability.CREATE_SHIPMENT,
      MarketplaceCapability.GET_RETURN,
      MarketplaceCapability.GET_PRICING,
      MarketplaceCapability.UPDATE_PRICING,
      MarketplaceCapability.GET_REPORT,
      MarketplaceCapability.WEBHOOKS,
      MarketplaceCapability.HEALTH_CHECK,
      MarketplaceCapability.TEST_CONNECTION,
    ],
    rateLimitPerMinute: Math.round(AMAZON_RATE_LIMITS.CATALOG_ITEMS.rate * 60),
    timeoutMs: 30000,
    maxRetries: 3,
    requiresCredentials: true,
    // Only the seller's own refresh token is stored per workspace/account.
    // clientId/clientSecret are global (ConfigurationService) and must never
    // be requested here. sellerId lives on MarketplaceAccount, not here.
    credentialFields: [
      { key: 'refreshToken', label: 'Refresh Token', required: true, sensitive: true, credentialType: MarketplaceCredentialType.OAUTH_TOKEN },
    ],
  };

  supportsCapability(capability: MarketplaceCapability): boolean {
    return this.metadata.supportedCapabilities.includes(capability);
  }

  supportsCountry(country: string): boolean {
    return this.metadata.supportedCountries.includes(country.toUpperCase());
  }

  supportsRegion(region: string): boolean {
    return this.metadata.supportedRegions.includes(region.toUpperCase());
  }

  supportsMarketplace(marketplaceKey: MarketplaceKey): boolean {
    return marketplaceKey === MarketplaceKey.AMAZON;
  }

  async validateCredentials(credentials: MarketplaceCredentials): Promise<MarketplaceCredentialValidationResult> {
    const missing = REQUIRED_CREDENTIAL_FIELDS.filter((key) => !credentials.fields?.[key]);
    return {
      valid: missing.length === 0,
      missing: [...missing],
      expired: credentials.expiresAt ? credentials.expiresAt < new Date() : false,
      errors: missing.map((key) => `Missing required field '${key}'`),
    };
  }

  async testConnection(
    context: MarketplaceRequestContext,
    credentials: MarketplaceCredentials,
  ): Promise<MarketplaceHealthResult> {
    const validation = await this.validateCredentials(credentials);
    if (!validation.valid) {
      return {
        providerKey: this.metadata.providerKey,
        accountId: context.accountId,
        status: MarketplaceHealthStatus.UNHEALTHY,
        checkedAt: new Date(),
        message: `Missing credential fields: ${validation.missing.join(', ')}`,
      };
    }

    const marketplace = this.resolveMarketplace(context.country);
    let amazonCredentials;
    try {
      amazonCredentials = composeAmazonCredentials(this.configurationService.getAmazonProviderConfig(), {
        refreshToken: credentials.fields.refreshToken,
        // Not part of our own credentialFields schema — honored if a caller
        // (e.g. a future orchestration layer joining MarketplaceAccount) put
        // it here, but never required or persisted by us.
        sellerId: credentials.fields.sellerId,
        marketplace,
      });
    } catch (err) {
      return {
        providerKey: this.metadata.providerKey,
        accountId: context.accountId,
        status: MarketplaceHealthStatus.UNHEALTHY,
        checkedAt: new Date(),
        message: (err as Error).message,
      };
    }

    const start = Date.now();
    try {
      const response = await this.spApiClient.get(
        amazonCredentials,
        AMAZON_API_PATHS.SELLER_INFO,
        undefined,
        AMAZON_RATE_LIMITS.SELLER_INFO,
        false,
      );
      return {
        providerKey: this.metadata.providerKey,
        accountId: context.accountId,
        status: response.status === 200 ? MarketplaceHealthStatus.HEALTHY : MarketplaceHealthStatus.DEGRADED,
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
      };
    } catch (err) {
      return {
        providerKey: this.metadata.providerKey,
        accountId: context.accountId,
        status: MarketplaceHealthStatus.UNHEALTHY,
        latencyMs: Date.now() - start,
        checkedAt: new Date(),
        message: (err as Error).message,
      };
    }
  }

  async healthCheck(accountId?: string): Promise<MarketplaceHealthResult> {
    // No accountId -> credential lookup is wired yet (out of scope for this change),
    // so this cannot make a real API call. Report UNKNOWN rather than fabricating HEALTHY.
    return {
      providerKey: this.metadata.providerKey,
      accountId: accountId ?? null,
      status: MarketplaceHealthStatus.UNKNOWN,
      checkedAt: new Date(),
      message: 'healthCheck requires resolved account credentials, which are not wired yet',
    };
  }

  private resolveMarketplace(country?: string): AmazonMarketplace {
    const key = (country ?? 'US').toUpperCase() as keyof typeof AmazonMarketplace;
    return AmazonMarketplace[key] ?? AmazonMarketplace.US;
  }
}
