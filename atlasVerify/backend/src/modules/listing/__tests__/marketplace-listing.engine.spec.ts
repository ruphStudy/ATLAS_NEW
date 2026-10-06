import { Test, TestingModule } from '@nestjs/testing';
import { MarketplaceListingEngine } from '../engine/marketplace-listing.engine';
import { MarketplaceMappingFactory } from '@modules/marketplace-listing-mapping/registry/marketplace-mapping.factory';
import { MarketplaceListingMappingRepository } from '@modules/marketplace-listing-mapping/marketplace-listing-mapping.repository';
import { TransformationStatus } from '@modules/marketplace-listing-mapping/interfaces';
import { ListingContent } from '../interfaces';

const mockFactory = {
  createTransformation: jest.fn(),
  createPreview: jest.fn(),
};

const mockMappingRepo = {
  findActiveSchema: jest.fn(),
  findAllCategoryMappingsForResolution: jest.fn(),
  findAllAttributeMappingsForResolution: jest.fn(),
};

function makeContent(): ListingContent {
  return {
    title: 'Test Product Title',
    brand: 'TestBrand',
    category: 'Electronics',
    description: 'A product description.',
    bulletPoints: ['Feature 1', 'Feature 2'],
    images: [
      { imageId: 'img1', url: 'https://cdn.com/1.jpg', isPrimary: true, position: 1, type: 'MAIN' },
    ],
    variants: [
      { variantId: 'v1', sku: 'SKU-1', name: 'Default', attributes: { color: 'Blue' } },
    ],
    attributes: { color: 'Blue', material: 'Plastic' },
    specifications: { Weight: '250g', Size: '10cm' },
    searchTerms: ['test', 'product'],
    pricing: { sellingPrice: 99.99, currency: 'USD', costPrice: 40 },
    seo: { metaTitle: 'Buy Test Product' },
  };
}

function makeSchema(): Record<string, unknown> {
  return {
    id: 'schema1',
    marketplaceKey: 'AMAZON',
    country: 'US',
    schemaVersion: '2.1.0',
    status: 'PUBLISHED',
    requiredFields: ['title', 'brand', 'category', 'description'],
    titleMaxLength: 200,
  };
}

function makeTransformResult(ok = true): Record<string, unknown> {
  return {
    status: ok ? TransformationStatus.SUCCESS : TransformationStatus.FAILED,
    marketplaceKey: 'AMAZON',
    country: 'US',
    transformedData: { title: 'Test Product Title', brand: 'TestBrand' },
    validationErrors: ok ? [] : [{ field: 'title', message: 'Title too long' }],
    warnings: [],
    schemaVersion: '2.1.0',
  };
}

describe('MarketplaceListingEngine', () => {
  let engine: MarketplaceListingEngine;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketplaceListingEngine,
        { provide: MarketplaceMappingFactory, useValue: mockFactory },
        { provide: MarketplaceListingMappingRepository, useValue: mockMappingRepo },
      ],
    }).compile();

    engine = module.get<MarketplaceListingEngine>(MarketplaceListingEngine);
  });

  describe('transform()', () => {
    it('calls factory.createTransformation with correct UniversalListingInput', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createTransformation.mockResolvedValue(makeTransformResult(true));

      await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { country: 'US', workspaceId: 'ws1' });

      expect(mockFactory.createTransformation).toHaveBeenCalledTimes(1);
      const [input] = mockFactory.createTransformation.mock.calls[0] as [Record<string, unknown>];
      expect(input.title).toBe('Test Product Title');
      expect(input.brand).toBe('TestBrand');
    });

    it('calls factory.createPreview for isDryRun=true', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createPreview.mockResolvedValue(makeTransformResult(true));

      await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { isDryRun: true, country: 'US', workspaceId: 'ws1' });

      expect(mockFactory.createPreview).toHaveBeenCalledTimes(1);
      expect(mockFactory.createTransformation).not.toHaveBeenCalled();
    });

    it('proceeds when no schema found (fallback mode)', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(null);
      mockFactory.createTransformation.mockResolvedValue(makeTransformResult(false));

      const result = await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { country: 'US', workspaceId: 'ws1' });

      expect(result.transformationResult).toBeDefined();
      expect(mockMappingRepo.findAllCategoryMappingsForResolution).not.toHaveBeenCalled();
    });

    it('returns schema version from schema', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createTransformation.mockResolvedValue(makeTransformResult(true));

      const result = await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { country: 'US' });
      expect(result.schemaVersion).toBe('2.1.0');
    });

    it('sets isDryRun on result', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createPreview.mockResolvedValue(makeTransformResult(true));

      const result = await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { isDryRun: true, country: 'US' });
      expect(result.isDryRun).toBe(true);
    });
  });

  describe('transformMultiple()', () => {
    it('returns a result per target', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createTransformation.mockResolvedValue(makeTransformResult(true));

      const results = await engine.transformMultiple(
        'ul1',
        'prod1',
        makeContent(),
        [
          { marketplaceKey: 'AMAZON', country: 'US' },
          { marketplaceKey: 'FLIPKART', country: 'IN' },
        ],
        { workspaceId: 'ws1' },
      );

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.marketplaceKey)).toContain('AMAZON');
      expect(results.map((r) => r.marketplaceKey)).toContain('FLIPKART');
    });
  });

  describe('contentToUniversalInput()', () => {
    it('maps all standard fields correctly', () => {
      // Access via transform by inspecting call args
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createTransformation.mockImplementation(async (input: Record<string, unknown>) => {
        expect(input.title).toBe('Test Product Title');
        expect(input.brand).toBe('TestBrand');
        expect(input.category).toBe('Electronics');
        expect(input.images).toHaveLength(1);
        expect(input.variants).toHaveLength(1);
        expect(input.searchKeywords).toContain('test');
        return makeTransformResult(true);
      });

      return engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { country: 'US' });
    });

    it('includes pricing fields in universal input', async () => {
      mockMappingRepo.findActiveSchema.mockResolvedValue(makeSchema());
      mockMappingRepo.findAllCategoryMappingsForResolution.mockResolvedValue([]);
      mockMappingRepo.findAllAttributeMappingsForResolution.mockResolvedValue([]);
      mockFactory.createTransformation.mockImplementation(async (input: Record<string, unknown>) => {
        expect(input.price).toBe(99.99);
        expect(input.currency).toBe('USD');
        return makeTransformResult(true);
      });

      await engine.transform('ul1', 'prod1', makeContent(), 'AMAZON', { country: 'US' });
    });
  });
});
