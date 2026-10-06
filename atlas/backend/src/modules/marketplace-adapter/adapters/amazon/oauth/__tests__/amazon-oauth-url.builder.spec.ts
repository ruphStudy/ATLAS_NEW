import { buildAmazonAuthorizationUrl } from '../amazon-oauth-url.builder';
import { AmazonMarketplace, AmazonRegion } from '../../interfaces/amazon.interfaces';
import { AMAZON_MARKETPLACE_REGIONS } from '../../constants/amazon.constants';

const GLOBAL = { applicationId: 'amzn1.sp.solution.test-app-id', redirectUri: 'https://atlas.example.com/callback' };

describe('buildAmazonAuthorizationUrl', () => {
  it('builds a Seller Central consent URL with the required params', () => {
    const url = new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.US, 'state-abc'));

    expect(url.origin).toBe('https://sellercentral.amazon.com');
    expect(url.pathname).toBe('/apps/authorize/consent');
    expect(url.searchParams.get('application_id')).toBe(GLOBAL.applicationId);
    expect(url.searchParams.get('state')).toBe('state-abc');
    expect(url.searchParams.get('redirect_uri')).toBe(GLOBAL.redirectUri);
    expect(url.searchParams.get('version')).toBe('beta');
  });

  // Regression test for MD9100: India was previously sent to the UK's Seller
  // Central domain because the consent URL was built from India's SP-API
  // *region* (EU) instead of India's own Seller Central *domain*.
  it('sends India sellers to sellercentral.amazon.in, not the UK domain, even though IN uses the EU SP-API region', () => {
    const url = new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.IN, 'state-in'));

    expect(url.origin).toBe('https://sellercentral.amazon.in');
    expect(AMAZON_MARKETPLACE_REGIONS[AmazonMarketplace.IN]).toBe(AmazonRegion.EU);
  });

  it('selects the correct Seller Central domain for representative NA/EU/FE marketplaces', () => {
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.US, 's')).origin).toBe('https://sellercentral.amazon.com');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.CA, 's')).origin).toBe('https://sellercentral.amazon.ca');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.MX, 's')).origin).toBe('https://sellercentral.amazon.com.mx');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.BR, 's')).origin).toBe('https://sellercentral.amazon.com.br');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.UK, 's')).origin).toBe('https://sellercentral-europe.amazon.com');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.DE, 's')).origin).toBe('https://sellercentral-europe.amazon.com');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.TR, 's')).origin).toBe('https://sellercentral.amazon.com.tr');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.AE, 's')).origin).toBe('https://sellercentral.amazon.ae');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.SG, 's')).origin).toBe('https://sellercentral.amazon.sg');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.AU, 's')).origin).toBe('https://sellercentral.amazon.com.au');
    expect(new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.JP, 's')).origin).toBe('https://sellercentral.amazon.co.jp');
  });

  it('keeps application_id, state, redirect_uri, and version intact regardless of marketplace', () => {
    const url = new URL(buildAmazonAuthorizationUrl(GLOBAL, AmazonMarketplace.IN, 'state-xyz'));

    expect(url.searchParams.get('application_id')).toBe(GLOBAL.applicationId);
    expect(url.searchParams.get('state')).toBe('state-xyz');
    expect(url.searchParams.get('redirect_uri')).toBe(GLOBAL.redirectUri);
    expect(url.searchParams.get('version')).toBe('beta');
    expect(url.pathname).toBe('/apps/authorize/consent');
  });

  it('throws a clear error when applicationId is not configured, instead of building a broken URL', () => {
    expect(() => buildAmazonAuthorizationUrl({ redirectUri: GLOBAL.redirectUri }, AmazonMarketplace.US, 's')).toThrow(
      /AMAZON_SP_API_APPLICATION_ID/,
    );
  });

  it('throws a clear error when redirectUri is not configured', () => {
    expect(() => buildAmazonAuthorizationUrl({ applicationId: GLOBAL.applicationId }, AmazonMarketplace.US, 's')).toThrow(
      /AMAZON_SP_API_REDIRECT_URI/,
    );
  });
});
