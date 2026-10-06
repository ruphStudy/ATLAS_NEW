import 'reflect-metadata';
import { DiscoveryProcessor } from '../discovery.processor';
import { DiscoveryRepository } from '../../discovery.repository';
import { MarketplaceAdapterRegistry } from '../../adapters/adapter.registry';
import type { ColdStartDiscoveryService } from '@modules/product-taxonomy/services/cold-start-discovery.service';
import type { ConfigurationService } from '@config/configuration.service';
import type { IDiscoveredProduct } from '../../interfaces';

// ── Fixtures ──────────────────────────────────────────────────
const WS_ID = 'workspace-uuid';
const SESSION_ID = 'session-uuid';

function buildSession(overrides: Record<string, unknown> = {}) {
  return {
    id: SESSION_ID,
    workspaceId: WS_ID,
    marketplace: 'AMAZON_US',
    country: 'US',
    keywords: ['wireless earbuds'],
    categories: [],
    status: 'PENDING',
    ...overrides,
  };
}

function buildProduct(overrides: Partial<IDiscoveredProduct> = {}): IDiscoveredProduct {
  return {
    keyword: 'wireless earbuds',
    marketplace: 'AMAZON_US',
    country: 'US',
    category: 'Electronics',
    title: 'Real Wireless Earbuds',
    rank: 1,
    externalProductId: 'B0REALASIN9',
    estimatedDemandScore: 0,
    estimatedCompetitionScore: 0,
    estimatedProfitScore: 0,
    estimatedAiScore: 0,
    rawData: { source: 'amazon_sp_api_catalog_items' },
    ...overrides,
  };
}

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    data: { sessionId: SESSION_ID, workspaceId: WS_ID },
    updateProgress: jest.fn(),
    ...overrides,
  };
}

async function* asyncIterableOf<T>(items: T[]): AsyncIterable<T> {
  for (const item of items) yield item;
}

describe('DiscoveryProcessor', () => {
  let processor: DiscoveryProcessor;
  let repo: jest.Mocked<DiscoveryRepository>;
  let registry: jest.Mocked<MarketplaceAdapterRegistry>;
  let coldStartDiscoveryService: jest.Mocked<ColdStartDiscoveryService>;
  let adapterDiscover: jest.Mock;

  beforeEach(() => {
    repo = {
      findSessionById: jest.fn(),
      updateSession: jest.fn(),
      createResult: jest.fn(),
      upsertCandidate: jest.fn(),
      createSnapshot: jest.fn(),
    } as unknown as jest.Mocked<DiscoveryRepository>;

    adapterDiscover = jest.fn();
    registry = {
      get: jest.fn().mockReturnValue({
        marketplace: 'AMAZON',
        supportedCountries: ['US'],
        supportsCountry: () => true,
        discover: adapterDiscover,
      }),
    } as unknown as jest.Mocked<MarketplaceAdapterRegistry>;

    coldStartDiscoveryService = {
      run: jest.fn(),
    } as unknown as jest.Mocked<ColdStartDiscoveryService>;

    processor = new DiscoveryProcessor(
      {} as ConfigurationService,
      repo,
      registry,
      coldStartDiscoveryService,
    );

    repo.findSessionById.mockResolvedValue(buildSession() as never);
    repo.updateSession.mockResolvedValue({} as never);
    repo.createResult.mockResolvedValue({} as never);
    repo.createSnapshot.mockResolvedValue(undefined as never);
  });

  afterEach(() => jest.clearAllMocks());

  // Calls the private BullMQ job handler directly — no worker/Redis involved.
  function run(job = buildJob()) {
    return (processor as unknown as { process(job: unknown): Promise<void> }).process(job);
  }

  it('regression: a normal single-keyword run completes without error and marks the session COMPLETED', async () => {
    adapterDiscover.mockReturnValue(asyncIterableOf([buildProduct()]));
    repo.upsertCandidate.mockResolvedValue({
      candidate: { id: 'candidate-1' },
      created: true,
    } as never);

    await run();

    expect(repo.updateSession).toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({ status: 'COMPLETED', totalDiscovered: 1 }),
    );
  });

  it('never creates an Opportunity — DiscoveryResult.opportunityId is always null', async () => {
    adapterDiscover.mockReturnValue(asyncIterableOf([buildProduct()]));
    repo.upsertCandidate.mockResolvedValue({
      candidate: { id: 'candidate-1' },
      created: true,
    } as never);

    await run();

    expect(repo.createResult).toHaveBeenCalledWith(
      expect.objectContaining({ opportunityId: null }),
    );
    // The old Opportunity-creation methods must no longer exist on the repository.
    expect((repo as unknown as Record<string, unknown>)['createOpportunityFromProduct']).toBeUndefined();
  });

  it('upserts a MarketplaceProductCandidate keyed on marketplace+country+externalProductId, never keyword', async () => {
    adapterDiscover.mockReturnValue(asyncIterableOf([buildProduct({ externalProductId: 'B0ASIN123' })]));
    repo.upsertCandidate.mockResolvedValue({
      candidate: { id: 'candidate-1' },
      created: true,
    } as never);

    await run();

    expect(repo.upsertCandidate).toHaveBeenCalledWith(
      expect.objectContaining({
        marketplaceKey: 'AMAZON_US',
        country: 'US',
        externalProductId: 'B0ASIN123',
      }),
    );
    expect(repo.upsertCandidate).not.toHaveBeenCalledWith(
      expect.objectContaining({ keyword: expect.anything() }),
    );
  });

  it('DiscoveryResult is linked to the upserted candidate', async () => {
    adapterDiscover.mockReturnValue(asyncIterableOf([buildProduct()]));
    repo.upsertCandidate.mockResolvedValue({
      candidate: { id: 'candidate-42' },
      created: true,
    } as never);

    await run();

    expect(repo.createResult).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceProductCandidateId: 'candidate-42' }),
    );
    expect(repo.createSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({ candidateId: 'candidate-42' }),
    );
  });

  it('rediscovering the same product within a run counts as a duplicate candidate, not a new one', async () => {
    adapterDiscover.mockReturnValue(
      asyncIterableOf([buildProduct(), buildProduct({ rank: 2 })]),
    );
    repo.upsertCandidate
      .mockResolvedValueOnce({ candidate: { id: 'candidate-1' }, created: true } as never)
      .mockResolvedValueOnce({ candidate: { id: 'candidate-1' }, created: false } as never);

    await run();

    expect(repo.updateSession).toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({
        status: 'COMPLETED',
        newOpportunities: 1, // legacy field name — counts new candidates
        duplicatesSkipped: 1,
      }),
    );
  });

  it('a discovered product with no external product ID gets a DiscoveryResult but no candidate/snapshot', async () => {
    adapterDiscover.mockReturnValue(asyncIterableOf([buildProduct({ externalProductId: null })]));

    await run();

    expect(repo.upsertCandidate).not.toHaveBeenCalled();
    expect(repo.createSnapshot).not.toHaveBeenCalled();
    expect(repo.createResult).toHaveBeenCalledWith(
      expect.objectContaining({ marketplaceProductCandidateId: null, opportunityId: null }),
    );
  });

  it('marks the session FAILED and preserves counters when the adapter throws mid-run', async () => {
    adapterDiscover.mockImplementation(async function* () {
      yield buildProduct();
      throw new Error('SP-API unavailable');
    });
    repo.upsertCandidate.mockResolvedValue({
      candidate: { id: 'candidate-1' },
      created: true,
    } as never);

    await expect(run()).rejects.toThrow('SP-API unavailable');

    expect(repo.updateSession).toHaveBeenCalledWith(
      SESSION_ID,
      expect.objectContaining({
        status: 'FAILED',
        totalDiscovered: 1,
        errorMessage: 'SP-API unavailable',
      }),
    );
  });

  describe('TREND_COLD_START mode', () => {
    it('runs ColdStartDiscoveryService instead of any marketplace adapter, and never creates a candidate/opportunity', async () => {
      repo.findSessionById.mockResolvedValue(buildSession({ mode: 'TREND_COLD_START' }) as never);
      coldStartDiscoveryService.run.mockResolvedValue({
        conceptsProcessed: 5,
        conceptsWithNewEvidence: 3,
        conceptsSkippedOrUnavailable: 2,
        searchDemandAvailable: false,
      });

      await run();

      expect(coldStartDiscoveryService.run).toHaveBeenCalled();
      expect(registry.get).not.toHaveBeenCalled();
      expect(repo.upsertCandidate).not.toHaveBeenCalled();
      expect(repo.createResult).not.toHaveBeenCalled();
      expect(repo.updateSession).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({
          status: 'COMPLETED',
          totalDiscovered: 5,
          newOpportunities: 3,
          duplicatesSkipped: 2,
        }),
      );
    });

    it('marks the session FAILED when the cold-start service throws', async () => {
      repo.findSessionById.mockResolvedValue(buildSession({ mode: 'TREND_COLD_START' }) as never);
      coldStartDiscoveryService.run.mockRejectedValue(new Error('Wikimedia unreachable'));

      await expect(run()).rejects.toThrow('Wikimedia unreachable');

      expect(repo.updateSession).toHaveBeenCalledWith(
        SESSION_ID,
        expect.objectContaining({ status: 'FAILED', errorMessage: 'Wikimedia unreachable' }),
      );
    });
  });
});
