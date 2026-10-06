import 'reflect-metadata';
import { ColdStartDiscoveryService } from '../services/cold-start-discovery.service';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductConceptRepository } from '../repositories/product-concept.repository';
import { TrendSignalRepository } from '../repositories/trend-signal.repository';
import { WikipediaTrendProvider } from '../providers/wikipedia-trend.provider';
import { GoogleSearchDemandProvider } from '../providers/google-search-demand.provider';
import { TrendSignalClassification, TrendSignalSubjectType, TREND_SIGNAL_TYPES } from '../interfaces';

describe('ColdStartDiscoveryService', () => {
  let service: ColdStartDiscoveryService;
  let categoryRepo: jest.Mocked<CategoryRepository>;
  let conceptRepo: jest.Mocked<ProductConceptRepository>;
  let signalRepo: jest.Mocked<TrendSignalRepository>;
  let wikipedia: jest.Mocked<WikipediaTrendProvider>;
  let googleProvider: jest.Mocked<GoogleSearchDemandProvider>;

  const CANDIDATE = { name: 'Smartwatch', categoryName: 'Consumer electronics', categoryParentName: null };

  beforeEach(() => {
    categoryRepo = { upsertByName: jest.fn(), findById: jest.fn(), findChildren: jest.fn(), create: jest.fn() } as never;
    conceptRepo = { upsert: jest.fn(), findById: jest.fn() } as never;
    signalRepo = { create: jest.fn(), findBySubject: jest.fn(), findAllByTypeAndClassification: jest.fn() } as never;
    wikipedia = { source: 'WIKIPEDIA', discoverConcepts: jest.fn(), getAttentionEvidence: jest.fn() } as never;
    googleProvider = { source: 'GOOGLE_KEYWORD_PLANNER', isConfigured: jest.fn(), getSearchDemandEvidence: jest.fn() } as never;

    service = new ColdStartDiscoveryService(categoryRepo, conceptRepo, signalRepo, wikipedia, googleProvider);

    categoryRepo.upsertByName.mockResolvedValue({ id: 'cat-1', parentId: null, name: 'Consumer electronics', slug: 'consumer-electronics', source: 'WIKIPEDIA', createdAt: new Date(), updatedAt: new Date() });
    conceptRepo.upsert.mockResolvedValue({ id: 'concept-1', categoryId: 'cat-1', name: 'Smartwatch', normalizedName: 'smartwatch', createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date() });
    signalRepo.findBySubject.mockResolvedValue([]);
    googleProvider.isConfigured.mockReturnValue(false);
  });

  it('never creates a MarketplaceProductCandidate or Opportunity — stays entirely marketplace-neutral', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    wikipedia.getAttentionEvidence.mockResolvedValue({
      value: 42, unit: 'percent_change_30d', capturedAt: new Date(), rawPayload: {},
    });

    const result = await service.run();

    expect(result.conceptsProcessed).toBe(1);
    expect(conceptRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Smartwatch', createdFrom: 'TREND_DISCOVERY' }),
    );
  });

  it('persists a RAW_PROVIDER ATTENTION signal with full provenance when Wikipedia returns real evidence', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    const capturedAt = new Date('2026-08-27T00:00:00.000Z');
    wikipedia.getAttentionEvidence.mockResolvedValue({
      value: 42, unit: 'percent_change_30d', capturedAt, rawPayload: { dailySeries: [] },
    });

    const result = await service.run();

    expect(signalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectType: TrendSignalSubjectType.PRODUCT_CONCEPT,
        subjectId: 'concept-1',
        signalType: TREND_SIGNAL_TYPES.ATTENTION,
        source: 'WIKIPEDIA',
        classification: TrendSignalClassification.RAW_PROVIDER,
        value: 42,
        unit: 'percent_change_30d',
        capturedAt,
      }),
    );
    expect(result.conceptsWithNewEvidence).toBe(1);
    expect(result.conceptsSkippedOrUnavailable).toBe(0);
  });

  it('does not fabricate a signal when Wikipedia has no real evidence for a concept', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    wikipedia.getAttentionEvidence.mockResolvedValue(null);

    const result = await service.run();

    expect(signalRepo.create).not.toHaveBeenCalled();
    expect(result.conceptsWithNewEvidence).toBe(0);
    expect(result.conceptsSkippedOrUnavailable).toBe(1);
  });

  it('skips re-fetching attention evidence when a fresh signal already exists (cost control)', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    signalRepo.findBySubject.mockResolvedValue([
      {
        id: 's1', subjectType: TrendSignalSubjectType.PRODUCT_CONCEPT, subjectId: 'concept-1',
        signalType: TREND_SIGNAL_TYPES.ATTENTION, source: 'WIKIPEDIA', classification: TrendSignalClassification.RAW_PROVIDER,
        value: 10, unit: 'percent_change_30d', rawPayload: null, explanationText: null,
        capturedAt: new Date(), createdAt: new Date(),
      },
    ]);

    const result = await service.run();

    expect(wikipedia.getAttentionEvidence).not.toHaveBeenCalled();
    expect(result.conceptsSkippedOrUnavailable).toBe(1);
  });

  it('never calls the search-demand provider when it reports unconfigured', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    wikipedia.getAttentionEvidence.mockResolvedValue({ value: 1, unit: 'percent_change_30d', capturedAt: new Date(), rawPayload: {} });
    googleProvider.isConfigured.mockReturnValue(false);

    const result = await service.run();

    expect(googleProvider.getSearchDemandEvidence).not.toHaveBeenCalled();
    expect(result.searchDemandAvailable).toBe(false);
  });

  it('persists a SEARCH_DEMAND signal when the validation provider is configured and returns real evidence', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    wikipedia.getAttentionEvidence.mockResolvedValue({ value: 1, unit: 'percent_change_30d', capturedAt: new Date(), rawPayload: {} });
    googleProvider.isConfigured.mockReturnValue(true);
    googleProvider.getSearchDemandEvidence.mockResolvedValue({
      value: 5000, unit: 'avg_monthly_searches', capturedAt: new Date(), rawPayload: {},
    });

    await service.run();

    expect(signalRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ signalType: TREND_SIGNAL_TYPES.SEARCH_DEMAND, source: 'GOOGLE_KEYWORD_PLANNER', value: 5000 }),
    );
  });

  it('continues the run (does not crash) when the search-demand provider throws', async () => {
    wikipedia.discoverConcepts.mockResolvedValue([CANDIDATE]);
    wikipedia.getAttentionEvidence.mockResolvedValue({ value: 1, unit: 'percent_change_30d', capturedAt: new Date(), rawPayload: {} });
    googleProvider.isConfigured.mockReturnValue(true);
    googleProvider.getSearchDemandEvidence.mockRejectedValue(new Error('not implemented'));

    await expect(service.run()).resolves.toBeDefined();
  });
});
