import { MarketplaceAdapterEngine } from '../marketplace-adapter.engine';
import { PublicationMarketplace } from '../../interfaces';

function makeDeps() {
  const adapter = {
    createListing: jest.fn().mockResolvedValue({ success: true, data: { sku: 'SKU-1' } }),
    updateListing: jest.fn().mockResolvedValue({ success: true, data: { sku: 'SKU-1' } }),
  };
  const amazonAdapterFactory = {
    create: jest.fn().mockResolvedValue(adapter),
    release: jest.fn().mockResolvedValue(undefined),
  };
  return { adapter, amazonAdapterFactory };
}

function makeEngine(deps: ReturnType<typeof makeDeps>) {
  return new MarketplaceAdapterEngine(deps.amazonAdapterFactory as any);
}

describe('MarketplaceAdapterEngine — AMAZON publish', () => {
  it('fails honestly (no fake success) when no marketplaceAccountId is provided', async () => {
    const deps = makeDeps();
    const engine = makeEngine(deps);

    const result = await engine.publish(
      PublicationMarketplace.AMAZON,
      { title: 'Widget', sku: 'SKU-1' },
      null,
      { workspaceId: 'ws-1', marketplaceAccountId: null },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('AMAZON_ACCOUNT_REQUIRED');
    expect(result.marketplaceResponse).toBeUndefined();
    expect(deps.amazonAdapterFactory.create).not.toHaveBeenCalled();
  });

  it('fails honestly when no SKU is present — never calls the mock path for Amazon', async () => {
    const deps = makeDeps();
    const engine = makeEngine(deps);

    const result = await engine.publish(
      PublicationMarketplace.AMAZON,
      { title: 'Widget' },
      null,
      { workspaceId: 'ws-1', marketplaceAccountId: 'acct-1' },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('SKU_REQUIRED');
    expect(deps.amazonAdapterFactory.create).not.toHaveBeenCalled();
  });

  it('creates a fresh adapter per request, passes real listing content, and never fabricates a marketplaceListingId', async () => {
    const deps = makeDeps();
    const engine = makeEngine(deps);

    const content = { title: 'Widget', sku: 'SKU-1', price: { amount: 19.99, currencyCode: 'USD' } };
    const result = await engine.publish(PublicationMarketplace.AMAZON, content, null, {
      workspaceId: 'ws-1',
      marketplaceAccountId: 'acct-1',
    });

    expect(deps.amazonAdapterFactory.create).toHaveBeenCalledWith('ws-1', 'acct-1');
    expect(deps.adapter.createListing).toHaveBeenCalledWith(expect.any(Object), content);
    expect(result.success).toBe(true);
    expect(result.marketplaceListingId).toBe('SKU-1');
    expect(deps.amazonAdapterFactory.release).toHaveBeenCalledWith(deps.adapter);
  });

  it('calls updateListing (not createListing) when an existing marketplaceListingId is present', async () => {
    const deps = makeDeps();
    const engine = makeEngine(deps);

    await engine.publish(
      PublicationMarketplace.AMAZON,
      { title: 'Widget', sku: 'SKU-1' },
      'SKU-1',
      { workspaceId: 'ws-1', marketplaceAccountId: 'acct-1' },
    );

    expect(deps.adapter.updateListing).toHaveBeenCalled();
    expect(deps.adapter.createListing).not.toHaveBeenCalled();
  });

  it('reports a real adapter failure as FAILED, not fake ACTIVE success', async () => {
    const deps = makeDeps();
    deps.adapter.createListing.mockResolvedValue({
      success: false,
      error: { code: 'ASIN_CONFLICT', message: 'Item already exists' },
    });
    const engine = makeEngine(deps);

    const result = await engine.publish(
      PublicationMarketplace.AMAZON,
      { title: 'Widget', sku: 'SKU-1' },
      null,
      { workspaceId: 'ws-1', marketplaceAccountId: 'acct-1' },
    );

    expect(result.success).toBe(false);
    expect(result.errorCode).toBe('ASIN_CONFLICT');
    expect(deps.amazonAdapterFactory.release).toHaveBeenCalledWith(deps.adapter);
  });

  it('releases the adapter even when the adapter call throws', async () => {
    const deps = makeDeps();
    deps.adapter.createListing.mockRejectedValue(new Error('network error'));
    const engine = makeEngine(deps);

    await expect(
      engine.publish(PublicationMarketplace.AMAZON, { title: 'Widget', sku: 'SKU-1' }, null, {
        workspaceId: 'ws-1',
        marketplaceAccountId: 'acct-1',
      }),
    ).rejects.toThrow('network error');

    expect(deps.amazonAdapterFactory.release).toHaveBeenCalledWith(deps.adapter);
  });
});
