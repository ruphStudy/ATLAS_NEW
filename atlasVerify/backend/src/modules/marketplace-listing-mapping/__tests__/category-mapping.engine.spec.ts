import { CategoryMappingEngine } from '../engines/category-mapping.engine';
import { ICategoryMapping, CategoryMappingStatus } from '../interfaces';

function makeMapping(overrides: Partial<ICategoryMapping> = {}): ICategoryMapping {
  return {
    id: 'cm1',
    workspaceId: 'ws1',
    schemaId: null,
    universalCategory: 'Electronics',
    marketplaceKey: 'AMAZON',
    country: 'US',
    marketplaceCategory: 'Electronics & Accessories',
    marketplaceCategoryId: '172282',
    categoryPath: 'Electronics > Accessories',
    confidence: 90,
    status: CategoryMappingStatus.MANUALLY_MAPPED,
    isManualOverride: true,
    version: 1,
    createdBy: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('CategoryMappingEngine', () => {
  let engine: CategoryMappingEngine;

  beforeEach(() => {
    engine = new CategoryMappingEngine();
  });

  describe('resolve()', () => {
    it('returns mapped category for exact match', () => {
      const mappings = [makeMapping()];
      const result = engine.resolve('Electronics', 'AMAZON', 'US', mappings, 'ws1');
      expect(result.marketplaceCategory).toBe('Electronics & Accessories');
      expect(result.confidence).toBe(90);
      expect(result.status).toBe(CategoryMappingStatus.MANUALLY_MAPPED);
      expect(result.source).toBe('workspace');
    });

    it('is case-insensitive on universalCategory', () => {
      const mappings = [makeMapping()];
      const result = engine.resolve('ELECTRONICS', 'AMAZON', 'US', mappings);
      expect(result.marketplaceCategory).toBe('Electronics & Accessories');
    });

    it('prefers workspace mapping over global', () => {
      const global = makeMapping({ workspaceId: null, confidence: 80 });
      const workspace = makeMapping({ workspaceId: 'ws1', confidence: 70, marketplaceCategory: 'WS Category' });
      const result = engine.resolve('Electronics', 'AMAZON', 'US', [global, workspace], 'ws1');
      expect(result.marketplaceCategory).toBe('WS Category');
      expect(result.source).toBe('workspace');
    });

    it('prefers manual override over auto-mapped', () => {
      const auto = makeMapping({ isManualOverride: false, status: CategoryMappingStatus.AUTO_MAPPED, marketplaceCategory: 'Auto' });
      const manual = makeMapping({ isManualOverride: true, status: CategoryMappingStatus.MANUALLY_MAPPED, marketplaceCategory: 'Manual' });
      const result = engine.resolve('Electronics', 'AMAZON', 'US', [auto, manual], 'ws1');
      expect(result.marketplaceCategory).toBe('Manual');
    });

    it('prefers country-specific over GLOBAL', () => {
      const global = makeMapping({ country: 'GLOBAL', marketplaceCategory: 'Global Cat' });
      const specific = makeMapping({ country: 'US', marketplaceCategory: 'US Cat' });
      const result = engine.resolve('Electronics', 'AMAZON', 'US', [global, specific], 'ws1');
      expect(result.marketplaceCategory).toBe('US Cat');
    });

    it('falls back to GLOBAL mapping when no country-specific found', () => {
      const global = makeMapping({ country: 'GLOBAL', marketplaceCategory: 'Global Cat' });
      const result = engine.resolve('Electronics', 'AMAZON', 'IN', [global], 'ws1');
      expect(result.marketplaceCategory).toBe('Global Cat');
    });

    it('returns UNMAPPED with empty category when no mapping found', () => {
      const result = engine.resolve('Unknown Category', 'AMAZON', 'US', [], 'ws1');
      expect(result.status).toBe(CategoryMappingStatus.UNMAPPED);
      expect(result.marketplaceCategory).toBe('');
      expect(result.source).toBe('missing');
    });

    it('skips INVALID mappings', () => {
      const invalid = makeMapping({ status: CategoryMappingStatus.INVALID });
      const result = engine.resolve('Electronics', 'AMAZON', 'US', [invalid], 'ws1');
      expect(result.status).toBe(CategoryMappingStatus.UNMAPPED);
    });
  });

  describe('detectMissing()', () => {
    it('returns true when no mapping found', () => {
      expect(engine.detectMissing('Unknown', 'AMAZON', 'US', [])).toBe(true);
    });

    it('returns false when mapping found', () => {
      const mappings = [makeMapping()];
      expect(engine.detectMissing('Electronics', 'AMAZON', 'US', mappings)).toBe(false);
    });
  });

  describe('validate()', () => {
    it('passes valid mapping', () => {
      const { valid, errors } = engine.validate(makeMapping());
      expect(valid).toBe(true);
      expect(errors).toHaveLength(0);
    });

    it('fails when universalCategory missing', () => {
      const { valid, errors } = engine.validate({ ...makeMapping(), universalCategory: '' });
      expect(valid).toBe(false);
      expect(errors).toContain('universalCategory is required');
    });

    it('fails when marketplaceCategory missing', () => {
      const { valid, errors } = engine.validate({ ...makeMapping(), marketplaceCategory: '' });
      expect(valid).toBe(false);
      expect(errors).toContain('marketplaceCategory is required');
    });

    it('fails when confidence out of range', () => {
      const { valid, errors } = engine.validate({ ...makeMapping(), confidence: 150 });
      expect(valid).toBe(false);
      expect(errors.some((e) => e.includes('confidence'))).toBe(true);
    });
  });

  describe('detectUnmappedCategories()', () => {
    it('returns only unmapped categories', () => {
      const mappings = [makeMapping()];
      const result = engine.detectUnmappedCategories(
        ['Electronics', 'Fashion', 'Home Appliances'],
        'AMAZON',
        'US',
        mappings,
      );
      expect(result).toContain('Fashion');
      expect(result).toContain('Home Appliances');
      expect(result).not.toContain('Electronics');
    });
  });
});
