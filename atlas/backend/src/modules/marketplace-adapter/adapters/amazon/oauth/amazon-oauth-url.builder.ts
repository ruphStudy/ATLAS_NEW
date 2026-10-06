import type { IAmazonProviderConfig } from '@config/interfaces';
import { AmazonMarketplace } from '../interfaces/amazon.interfaces';

/**
 * Official per-marketplace Seller Central domains for the "Authorization
 * workflow initiated by your application" consent screen
 * (https://developer-docs.amazon.com/sp-api/docs/seller-central-urls).
 *
 * Deliberately keyed by AmazonMarketplace, NOT by AmazonRegion
 * (AMAZON_MARKETPLACE_REGIONS in amazon.constants.ts): the SP-API
 * NA/EU/FE grouping is only about which *data-plane API host* serves a
 * marketplace after authorization — it does not describe which Seller
 * Central *login/consent* domain a seller in that marketplace actually
 * uses. India, UAE, and Turkey are grouped under the EU SP-API region for
 * API calls, but each has its own standalone Seller Central login —
 * mixing the two caused ATLAS to send India sellers to the UK's
 * Seller Central (sellercentral.amazon.co.uk), which Amazon rejects with
 * error MD9100 ("This app does not have the right application details to
 * connect to your account"). UK/DE/FR/IT/ES/NL/SE/PL sellers share one
 * unified EU consent domain (sellercentral-europe.amazon.com) — that is
 * Amazon's documented domain, not a per-country .de/.fr/.it/.es guess.
 */
const SELLER_CENTRAL_DOMAINS: Record<AmazonMarketplace, string> = {
  [AmazonMarketplace.US]: 'https://sellercentral.amazon.com',
  [AmazonMarketplace.CA]: 'https://sellercentral.amazon.ca',
  [AmazonMarketplace.MX]: 'https://sellercentral.amazon.com.mx',
  [AmazonMarketplace.BR]: 'https://sellercentral.amazon.com.br',
  [AmazonMarketplace.UK]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.DE]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.FR]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.IT]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.ES]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.NL]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.SE]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.PL]: 'https://sellercentral-europe.amazon.com',
  [AmazonMarketplace.TR]: 'https://sellercentral.amazon.com.tr',
  [AmazonMarketplace.AE]: 'https://sellercentral.amazon.ae',
  [AmazonMarketplace.IN]: 'https://sellercentral.amazon.in',
  [AmazonMarketplace.SG]: 'https://sellercentral.amazon.sg',
  [AmazonMarketplace.AU]: 'https://sellercentral.amazon.com.au',
  [AmazonMarketplace.JP]: 'https://sellercentral.amazon.co.jp',
};

/**
 * Builds Amazon's seller-consent authorization URL.
 *
 * `applicationId` (Seller Central "Application ID"/Solution ID) is distinct
 * from the LWA `clientId` used for token exchange — both are required, but
 * for different steps of the flow. There is no separate "sandbox" consent
 * URL: sandbox vs production is purely a matter of which SP-API host is
 * called afterwards (see amazon.constants.ts resolveAmazonSpApiBaseUrl) —
 * the seller still consents via the same real Seller Central flow using a
 * developer/test account.
 *
 * `version=beta` is kept unconditionally, matching the current Draft-app
 * test flow this app is in — this is not (yet) determined from any stored
 * application-status flag.
 */
export function buildAmazonAuthorizationUrl(
  global: Pick<IAmazonProviderConfig, 'applicationId' | 'redirectUri'>,
  marketplace: AmazonMarketplace,
  state: string,
): string {
  if (!global.applicationId) {
    throw new Error(
      'Amazon SP-API is not configured for authorization: AMAZON_SP_API_APPLICATION_ID must be set.',
    );
  }
  if (!global.redirectUri) {
    throw new Error(
      'Amazon SP-API is not configured for authorization: AMAZON_SP_API_REDIRECT_URI must be set.',
    );
  }

  const domain = SELLER_CENTRAL_DOMAINS[marketplace];

  const url = new URL('/apps/authorize/consent', domain);
  url.searchParams.set('application_id', global.applicationId);
  url.searchParams.set('state', state);
  url.searchParams.set('redirect_uri', global.redirectUri);
  url.searchParams.set('version', 'beta');
  return url.toString();
}
