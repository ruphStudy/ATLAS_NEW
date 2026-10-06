import 'reflect-metadata';
import { TrendConceptQueryService } from '../services/trend-concept-query.service';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductConceptRepository } from '../repositories/product-concept.repository';
import { TrendSignalRepository } from '../repositories/trend-signal.repository';
import { TrendSignalClassification, TrendSignalSubjectType, TREND_SIGNAL_TYPES } from '../interfaces';
import type { ITrendSignal } from '../interfaces';

function attentionSignal(overrides: Partial<ITrendSignal> = {}): ITrendSignal {
  return {
    id: 'sig-1',
    subjectType: TrendSignalSubjectType.PRODUCT_CONCEPT,
    subjectId: 'concept-1',
    signalType: TREND_SIGNAL_TYPES.ATTENTION,
    source: 'WIKIPEDIA',
    classification: TrendSignalClassification.RAW_PROVIDER,
    value: 10,
    unit: 'percent_change_30d',
    rawPayload: {},
    explanationText: null,
    capturedAt: new Date('2026-08-27T00:00:00.000Z'),
    createdAt: new Date('2026-08-27T00:00:00.000Z'),
    ...overrides,
  };
}

describe('TrendConceptQueryService', () => {
  let service: TrendConceptQueryService;
  let conceptRepo: jest.Mocked<ProductConceptRepository>;
  let categoryRepo: jest.Mocked<CategoryRepository>;
  let signalRepo: jest.Mocked<TrendSignalRepository>;

  beforeEach(() => {
    conceptRepo = { findById: jest.fn(), upsert: jest.fn() } as never;
    categoryRepo = { findById: jest.fn(), upsertByName: jest.fn() } as never;
    signalRepo = { findAllByTypeAndClassification: jest.fn(), create: jest.fn(), findBySubject: jest.fn() } as never;
    service = new TrendConceptQueryService(conceptRepo, categoryRepo, signalRepo);
  });

  it('ranks concepts by their latest real ATTENTION value, highest first', async () => {
    signalRepo.findAllByTypeAndClassification.mockImplementation(async (signalType) => {
      if (signalType === TREND_SIGNAL_TYPES.ATTENTION) {
        return [
          attentionSignal({ subjectId: 'concept-low', value: 5 }),
          attentionSignal({ subjectId: 'concept-high', value: 90 }),
        ];
      }
      return [];
    });
    conceptRepo.findById.mockImplementation(async (id) => ({
      id, categoryId: null, name: id, normalizedName: id, createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date(),
    }));

    const result = await service.listTrendingConcepts(10);

    expect(result.map((r) => r.conceptId)).toEqual(['concept-high', 'concept-low']);
  });

  it('classifies a concept with attention evidence only as EMERGING_NEEDS_VALIDATION', async () => {
    signalRepo.findAllByTypeAndClassification.mockImplementation(async (signalType) =>
      signalType === TREND_SIGNAL_TYPES.ATTENTION ? [attentionSignal()] : [],
    );
    conceptRepo.findById.mockResolvedValue({
      id: 'concept-1', categoryId: null, name: 'Smartwatch', normalizedName: 'smartwatch', createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date(),
    });

    const [result] = await service.listTrendingConcepts(10);

    expect(result.state).toBe('EMERGING_NEEDS_VALIDATION');
    expect(result.searchDemandSignal).toBeNull();
  });

  it('classifies a concept corroborated by search-demand as TREND_CANDIDATE — never on attention alone', async () => {
    signalRepo.findAllByTypeAndClassification.mockImplementation(async (signalType) => {
      if (signalType === TREND_SIGNAL_TYPES.ATTENTION) return [attentionSignal()];
      if (signalType === TREND_SIGNAL_TYPES.SEARCH_DEMAND) {
        return [attentionSignal({ signalType: TREND_SIGNAL_TYPES.SEARCH_DEMAND, source: 'GOOGLE_KEYWORD_PLANNER', value: 5000, unit: 'avg_monthly_searches' })];
      }
      return [];
    });
    conceptRepo.findById.mockResolvedValue({
      id: 'concept-1', categoryId: null, name: 'Smartwatch', normalizedName: 'smartwatch', createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date(),
    });

    const [result] = await service.listTrendingConcepts(10);

    expect(result.state).toBe('TREND_CANDIDATE');
    expect(result.searchDemandSignal?.value).toBe(5000);
  });

  it('every returned entry carries source, classification, capturedAt, and value/unit (data-honesty provenance)', async () => {
    signalRepo.findAllByTypeAndClassification.mockImplementation(async (signalType) =>
      signalType === TREND_SIGNAL_TYPES.ATTENTION ? [attentionSignal()] : [],
    );
    conceptRepo.findById.mockResolvedValue({
      id: 'concept-1', categoryId: 'cat-1', name: 'Smartwatch', normalizedName: 'smartwatch', createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date(),
    });
    categoryRepo.findById.mockResolvedValue({
      id: 'cat-1', parentId: null, name: 'Consumer electronics', slug: 'consumer-electronics', source: 'WIKIPEDIA', createdAt: new Date(), updatedAt: new Date(),
    });

    const [result] = await service.listTrendingConcepts(10);

    expect(result.categoryName).toBe('Consumer electronics');
    expect(result.attentionSignal).toMatchObject({
      source: 'WIKIPEDIA',
      classification: TrendSignalClassification.RAW_PROVIDER,
      value: 10,
      unit: 'percent_change_30d',
    });
    expect(result.attentionSignal?.capturedAt).toBeInstanceOf(Date);
  });

  it('respects the requested limit', async () => {
    signalRepo.findAllByTypeAndClassification.mockImplementation(async (signalType) =>
      signalType === TREND_SIGNAL_TYPES.ATTENTION
        ? [attentionSignal({ subjectId: 'a', value: 1 }), attentionSignal({ subjectId: 'b', value: 2 })]
        : [],
    );
    conceptRepo.findById.mockImplementation(async (id) => ({
      id, categoryId: null, name: id, normalizedName: id, createdFrom: 'TREND_DISCOVERY', createdAt: new Date(), updatedAt: new Date(),
    }));

    const result = await service.listTrendingConcepts(1);

    expect(result).toHaveLength(1);
  });
});
