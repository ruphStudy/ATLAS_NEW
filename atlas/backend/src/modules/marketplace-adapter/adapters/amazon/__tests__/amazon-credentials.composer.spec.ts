import { composeAmazonCredentials } from '../amazon-credentials.composer';
import { AmazonMarketplace, AmazonRegion } from '../interfaces/amazon.interfaces';
import type { IAmazonProviderConfig } from '@config/interfaces';

const GLOBAL: IAmazonProviderConfig = {
  clientId: 'global-client-id',
  clientSecret: 'global-client-secret',
  environment: 'sandbox',
};

describe('composeAmazonCredentials', () => {
  it('produces the final runtime credential object with every required field populated', () => {
    const result = composeAmazonCredentials(GLOBAL, {
      refreshToken: 'seller-refresh-token',
      sellerId: 'A1SELLERID',
      marketplace: AmazonMarketplace.US,
    });

    expect(result).toEqual({
      clientId: 'global-client-id',
      clientSecret: 'global-client-secret',
      refreshToken: 'seller-refresh-token',
      sellerId: 'A1SELLERID',
      marketplace: AmazonMarketplace.US,
      region: AmazonRegion.NA,
    });
  });

  it('does not lose sellerId when composing', () => {
    const result = composeAmazonCredentials(GLOBAL, {
      refreshToken: 'seller-refresh-token',
      sellerId: 'SELLER-42',
      marketplace: AmazonMarketplace.IN,
    });

    expect(result.sellerId).toBe('SELLER-42');
    expect(result.region).toBe(AmazonRegion.EU); // AMAZON_MARKETPLACE_REGIONS[IN] = EU
  });

  it('defaults sellerId to empty string (never undefined/lost) when the seller record has none yet', () => {
    const result = composeAmazonCredentials(GLOBAL, {
      refreshToken: 'seller-refresh-token',
      marketplace: AmazonMarketplace.US,
    });

    expect(result.sellerId).toBe('');
  });

  it('clientId/clientSecret always come from the global config argument, never from seller input', () => {
    const result = composeAmazonCredentials(GLOBAL, {
      refreshToken: 'seller-refresh-token',
      sellerId: 'A1SELLERID',
      marketplace: AmazonMarketplace.US,
      // @ts-expect-error — seller authorization has no clientId/clientSecret fields at all
      clientId: 'attempted-seller-supplied-client-id',
    });

    expect(result.clientId).toBe('global-client-id');
    expect(result.clientSecret).toBe('global-client-secret');
  });

  it('throws a clear error when global clientId/clientSecret are not configured', () => {
    expect(() =>
      composeAmazonCredentials(
        { environment: 'sandbox' },
        { refreshToken: 'seller-refresh-token', sellerId: 'A1SELLERID', marketplace: AmazonMarketplace.US },
      ),
    ).toThrow(/AMAZON_SP_API_CLIENT_ID/);
  });

  it('throws a clear error when the seller refreshToken is missing', () => {
    expect(() =>
      composeAmazonCredentials(GLOBAL, {
        refreshToken: '',
        sellerId: 'A1SELLERID',
        marketplace: AmazonMarketplace.US,
      }),
    ).toThrow(/refreshToken/);
  });
});
