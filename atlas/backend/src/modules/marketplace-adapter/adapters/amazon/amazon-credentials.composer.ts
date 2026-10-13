import type { IAmazonProviderConfig } from '@config/interfaces';
import { AMAZON_MARKETPLACE_REGIONS } from './constants/amazon.constants';
import { AmazonMarketplace, AmazonRegion, IAmazonCredentials } from './interfaces/amazon.interfaces';

/**
 * The seller/account-specific half of Amazon credentials: everything that
 * varies per workspace/seller account. Sourced from a decrypted
 * marketplace-provider-credentials record (refreshToken) plus
 * MarketplaceAccount (sellerId, marketplace) — never from global config.
 */
export interface AmazonSellerAuthorization {
  refreshToken: string;
  sellerId?: string | null;
  marketplace: AmazonMarketplace;
}

/**
 * The single place in the codebase that builds a full IAmazonCredentials
 * object. Combines ATLAS's global SP-API app credentials (one clientId/
 * clientSecret pair for the whole deployment, from ConfigurationService)
 * with a seller's own authorization (refreshToken/sellerId/marketplace).
 *
 * clientId/clientSecret NEVER come from anywhere else — this is what
 * guarantees they are always global, never per-workspace.
 */
export function composeAmazonCredentials(
  global: IAmazonProviderConfig,
  seller: AmazonSellerAuthorization,
): IAmazonCredentials {
  if (!global.clientId || !global.clientSecret) {
    throw new Error(
      'Amazon SP-API is not configured: AMAZON_SP_API_CLIENT_ID and AMAZON_SP_API_CLIENT_SECRET must both be set.',
    );
  }
  if (!seller.refreshToken) {
    throw new Error('Amazon seller refreshToken is required to compose runtime credentials.');
  }

  return {
    clientId: global.clientId,
    clientSecret: global.clientSecret,
    refreshToken: seller.refreshToken,
    sellerId: seller.sellerId ?? '',
    marketplace: seller.marketplace,
    region: AMAZON_MARKETPLACE_REGIONS[seller.marketplace] ?? AmazonRegion.NA,
  };
}

/**
 * Builds credentials for ATLAS's own sandbox-health checks ONLY: the
 * dedicated sandbox LWA app + the global sandbox refresh token, marked
 * `app: 'sandbox'` so token refresh and SP-API calls use the sandbox app and
 * sandbox host regardless of AMAZON_SP_API_ENVIRONMENT. Never used for
 * seller OAuth or connected-seller runtime calls.
 */
export function composeAmazonSandboxCredentials(
  global: IAmazonProviderConfig,
  marketplace: AmazonMarketplace,
): IAmazonCredentials {
  if (!global.sandboxClientId || !global.sandboxClientSecret) {
    throw new Error(
      'Amazon SP-API sandbox app is not configured: AMAZON_SP_API_SANDBOX_CLIENT_ID and AMAZON_SP_API_SANDBOX_CLIENT_SECRET must both be set.',
    );
  }
  if (!global.sandboxRefreshToken) {
    throw new Error('AMAZON_SP_API_SANDBOX_REFRESH_TOKEN is not configured');
  }

  return {
    clientId: global.sandboxClientId,
    clientSecret: global.sandboxClientSecret,
    refreshToken: global.sandboxRefreshToken,
    sellerId: '',
    marketplace,
    region: AMAZON_MARKETPLACE_REGIONS[marketplace] ?? AmazonRegion.NA,
    app: 'sandbox',
  };
}
