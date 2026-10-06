import { AmazonAdapter } from '../amazon.adapter';
import { AmazonSpApiClient } from '../client/amazon-sp-api.client';
import { AmazonAuthService } from '../auth/amazon-auth.service';
import { AmazonRequestMapper } from '../mappers/amazon-request.mapper';
import { AmazonResponseMapper } from '../mappers/amazon-response.mapper';
import { AmazonErrorMapper } from '../mappers/amazon-error.mapper';
import { AmazonAdapterEventQueue } from '../events/amazon-adapter-event.queue';
import { ResponseNormalizer } from '../../../normalizer/response.normalizer';
import { AmazonMarketplace, AmazonRegion, IAmazonCredentials } from '../interfaces/amazon.interfaces';
import { AMAZON_API_PATHS, AMAZON_CATALOG_INCLUDED_DATA } from '../constants/amazon.constants';

const CREDENTIALS: IAmazonCredentials = {
  clientId: 'global-client-id',
  clientSecret: 'global-client-secret',
  refreshToken: 'sandbox-refresh-token',
  sellerId: '',
  marketplace: AmazonMarketplace.IN,
  region: AmazonRegion.EU,
};

function makeAdapter(spApiClientGet: jest.Mock) {
  const spApiClient = { get: spApiClientGet } as unknown as AmazonSpApiClient;
  const requestMapper = new AmazonRequestMapper();
  const responseMapper = new AmazonResponseMapper();

  const adapter = new AmazonAdapter(
    spApiClient,
    {} as AmazonAuthService,
    requestMapper,
    responseMapper,
    {} as AmazonErrorMapper,
    {} as AmazonAdapterEventQueue,
    {} as ResponseNormalizer,
    {} as any,
  );

  return { adapter, spApiClient };
}

describe('AmazonAdapter.searchCatalogItems (stateless Catalog Items search)', () => {
  it('sends the keyword to Amazon under the `keywords` query param', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, { keywords: ['wireless earbuds'] });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({ keywords: ['wireless earbuds'] }),
      expect.any(Object),
      undefined,
    );
  });

  it('sends the correct marketplaceId derived from the passed-in credentials', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, { keywords: ['toy'] });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({ marketplaceIds: [AmazonMarketplace.IN] }),
      expect.any(Object),
      undefined,
    );
  });

  it('requests includedData so summaries/images/salesRanks are actually returned', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, { keywords: ['toy'] });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({ includedData: AMAZON_CATALOG_INCLUDED_DATA }),
      expect.any(Object),
      undefined,
    );
  });

  it('maps each returned Catalog Items entry through the existing response mapper', async () => {
    const get = jest.fn().mockResolvedValue({
      status: 200,
      data: {
        items: [
          { asin: 'B000TEST01', summaries: [{ itemName: 'Real Product Title', brand: 'RealBrand' }] },
          { asin: 'B000TEST02' },
        ],
      },
    });
    const { adapter } = makeAdapter(get);

    const result = await adapter.searchCatalogItems(CREDENTIALS, { keywords: ['toy'] });

    expect(result.items).toHaveLength(2);
    expect(result.items[0]).toMatchObject({ asin: 'B000TEST01', summaries: [{ itemName: 'Real Product Title', brand: 'RealBrand' }] });
    expect(result.items[1]).toMatchObject({ asin: 'B000TEST02' });
  });

  it('does not require an initialized (per-seller) adapter instance — no initialize() call needed', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    // Deliberately never called adapter.initialize() — proves this path has
    // no MarketplaceAccount/seller-init dependency.
    await expect(adapter.searchCatalogItems(CREDENTIALS, { keywords: ['toy'] })).resolves.toBeDefined();
  });
});

/**
 * Amazon's Catalog Items *static* sandbox (AMAZON_SP_API_ENVIRONMENT=sandbox)
 * pattern-matches a small, fixed set of pre-registered requests — it does
 * NOT run a real search index, so arbitrary `keywords` text (e.g. "wireless
 * earbuds") returns `400 InvalidInput: Could not match input arguments`
 * regardless of how correctly ATLAS builds the request. See the fix report
 * for the full investigation. No local Amazon Catalog Items OpenAPI
 * model/spec ships in this repo or as a dependency, so the literal
 * Amazon-registered fixture identifier value could not be confirmed here —
 * these tests instead prove the MECHANISM Amazon's static sandbox is
 * documented to require (`identifiers` + `identifiersType`, mutually
 * exclusive with `keywords`) is correctly constructed and mapped, the same
 * way every other test in this file proves request/response handling
 * against a mocked `AmazonSpApiClient.get()` rather than live Amazon.
 *
 * This is sandbox VERIFICATION only — production Discovery
 * (`discovery/adapters/amazon/amazon.adapter.ts`) is untouched and
 * continues to call `searchCatalogItems()` with only the user's real
 * `keywords`, never `identifiers`.
 */
describe('AmazonAdapter.searchCatalogItems (identifier-based search — static sandbox request shape)', () => {
  // Representative example ASIN — any well-formed identifier proves the
  // request-construction/response-mapping mechanism via the mocked client
  // below; it is not asserted to be Amazon's actual registered sandbox
  // fixture value (see report item 6).
  const SANDBOX_VERIFICATION_ASIN = 'B000TEST01';

  it('sends identifiers + identifiersType instead of keywords when identifiers are provided', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, {
      identifiers: [SANDBOX_VERIFICATION_ASIN],
      identifiersType: 'ASIN',
    });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({ identifiers: [SANDBOX_VERIFICATION_ASIN], identifiersType: 'ASIN' }),
      expect.any(Object),
      undefined,
    );
    const [, , sentParams] = get.mock.calls[0];
    expect(sentParams.keywords).toBeUndefined();
  });

  it('defaults identifiersType to ASIN when identifiers are given without an explicit type', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, { identifiers: [SANDBOX_VERIFICATION_ASIN] });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({ identifiersType: 'ASIN' }),
      expect.any(Object),
      undefined,
    );
  });

  it('prefers identifiers over keywords when both are (incorrectly) provided, since Amazon rejects both set at once', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, {
      identifiers: [SANDBOX_VERIFICATION_ASIN],
      identifiersType: 'ASIN',
      keywords: ['wireless earbuds'],
    });

    const [, , sentParams] = get.mock.calls[0];
    expect(sentParams.identifiers).toEqual([SANDBOX_VERIFICATION_ASIN]);
    expect(sentParams.keywords).toBeUndefined();
  });

  it('maps the static sandbox success response through the existing response mapper, proving the mechanism end-to-end', async () => {
    const get = jest.fn().mockResolvedValue({
      status: 200,
      data: {
        items: [
          {
            asin: SANDBOX_VERIFICATION_ASIN,
            summaries: [{ itemName: 'Sandbox Catalog Item', brand: 'SandboxBrand' }],
          },
        ],
      },
    });
    const { adapter } = makeAdapter(get);

    const result = await adapter.searchCatalogItems(CREDENTIALS, {
      identifiers: [SANDBOX_VERIFICATION_ASIN],
      identifiersType: 'ASIN',
    });

    expect(result.status).toBe(200);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      asin: SANDBOX_VERIFICATION_ASIN,
      summaries: [{ itemName: 'Sandbox Catalog Item', brand: 'SandboxBrand' }],
    });
  });

  it('still includes marketplaceIds and includedData alongside an identifier-based lookup', async () => {
    const get = jest.fn().mockResolvedValue({ status: 200, data: { items: [] } });
    const { adapter } = makeAdapter(get);

    await adapter.searchCatalogItems(CREDENTIALS, {
      identifiers: [SANDBOX_VERIFICATION_ASIN],
      identifiersType: 'ASIN',
    });

    expect(get).toHaveBeenCalledWith(
      CREDENTIALS,
      AMAZON_API_PATHS.CATALOG_ITEMS,
      expect.objectContaining({
        marketplaceIds: [AmazonMarketplace.IN],
        includedData: AMAZON_CATALOG_INCLUDED_DATA,
      }),
      expect.any(Object),
      undefined,
    );
  });
});
