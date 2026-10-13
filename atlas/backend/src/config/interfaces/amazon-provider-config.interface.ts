export type AmazonSpApiEnvironment = 'sandbox' | 'production';

/**
 * Amazon SP-API global app-level configuration.
 * clientId/clientSecret are ATLAS's own LWA (Login with Amazon) application
 * credentials, used to exchange authorization codes/refresh tokens for
 * access tokens — shared across every workspace/seller account.
 *
 * applicationId is a SEPARATE identifier Amazon assigns when the SP-API app
 * is registered in Seller Central ("Develop Apps") — it is NOT the same
 * value as clientId, and is required to build the seller-consent
 * (authorization) URL, distinct from the LWA token-exchange credentials.
 *
 * redirectUri is the exact callback URL registered with Amazon for this app;
 * Amazon requires an exact match.
 *
 * Per-seller refreshToken and sellerId are NOT part of this config; they
 * live in marketplace-provider-credentials / marketplace-account.
 *
 * sandboxRefreshToken is the one exception: a single global refresh token
 * for Amazon's SP-API *sandbox* environment, used only to verify ATLAS's
 * own global sandbox configuration (clientId/clientSecret/connectivity)
 * without needing any real seller to have connected an account. Never used
 * for production calls or for any real workspace/seller operation.
 */
export interface IAmazonProviderConfig {
  clientId?: string;
  clientSecret?: string;
  applicationId?: string;
  redirectUri?: string;
  /** Draft-app testing: append `version=beta` to Seller Central authorization URLs. */
  useBetaAuthVersion: boolean;
  sandboxRefreshToken?: string;
  environment: AmazonSpApiEnvironment;
}
