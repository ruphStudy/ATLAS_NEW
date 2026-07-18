import { ListingBuilderEngine, SourceData } from '../engine/listing-builder.engine';
import { ListingSection } from '../interfaces';

function makeSource(overrides: Partial<SourceData> = {}): SourceData {
  return {
    catalogProduct: {
      productName: 'Sony BRAVIA 55" TV',
      brand: 'Sony',
      category: 'Electronics',
      description: 'Best 4K TV',
      suggestedSellingPrice: 799.99,
      totalLandedCostUsd: 400,
      variants: [
        {
          variantId: 'v1', sku: 'SKU-55', name: '55"',
          attributes: { size: '55"' }, suggestedSellingPrice: 799.99,
        },
      ],
      attributes: [{ name: 'color', value: 'Black' }],
      specifications: [{ name: 'Resolution', value: '4K', unit: 'UHD' }],
    },
    aiDescription: {
      generatedContent: {
        mainDescription: 'AI Description',
        bulletPoints: ['Bullet 1', 'Bullet 2'],
      },
    },
    aiSeo: {
      optimizedContent: {
        productTitle: 'SEO Title',
        backendSearchTerms: ['sony tv', '4k'],
        searchKeywords: ['bravia'],
      },
    },
    aiImageSet: {
      generatedImages: [
        { imageId: 'img1', url: 'https://cdn.com/1.jpg', status: 'APPROVED', imageType: 'MAIN' },
        { imageId: 'img2', url: 'https://cdn.com/2.jpg', status: 'APPROVED', imageType: 'LIFESTYLE' },
        { imageId: 'img3', url: 'https://cdn.com/3.jpg', status: 'REJECTED', imageType: 'MAIN' },
      ],
    },
    ...overrides,
  };
}

describe('ListingBuilderEngine', () => {
  let engine: ListingBuilderEngine;

  beforeEach(() => {
    engine = new ListingBuilderEngine();
  });

  it('builds title from aiSeo first', () => {
    const { content } = engine.build(makeSource(), [ListingSection.TITLE]);
    expect(content.title).toBe('SEO Title');
  });

  it('falls back to catalogProduct.productName when no aiSeo', () => {
    const { content } = engine.build(makeSource({ aiSeo: null }), [ListingSection.TITLE]);
    expect(content.title).toBe('Sony BRAVIA 55" TV');
  });

  it('builds brand from catalogProduct', () => {
    const { content } = engine.build(makeSource(), [ListingSection.BRAND]);
    expect(content.brand).toBe('Sony');
  });

  it('builds category from catalogProduct', () => {
    const { content } = engine.build(makeSource(), [ListingSection.CATEGORY]);
    expect(content.category).toBe('Electronics');
  });

  it('builds description from aiDescription', () => {
    const { content } = engine.build(makeSource(), [ListingSection.DESCRIPTION]);
    expect(content.description).toBe('AI Description');
  });

  it('builds bullet points from aiDescription', () => {
    const { content } = engine.build(makeSource(), [ListingSection.BULLET_POINTS]);
    expect(content.bulletPoints).toEqual(['Bullet 1', 'Bullet 2']);
  });

  it('only includes APPROVED images', () => {
    const { content } = engine.build(makeSource(), [ListingSection.IMAGES]);
    expect(content.images).toHaveLength(2);
    expect(content.images![0]!.isPrimary).toBe(true);
  });

  it('builds variants from catalogProduct', () => {
    const { content } = engine.build(makeSource(), [ListingSection.VARIANTS]);
    expect(content.variants).toHaveLength(1);
    expect(content.variants![0]!.sku).toBe('SKU-55');
  });

  it('builds attributes map from catalogProduct', () => {
    const { content } = engine.build(makeSource(), [ListingSection.ATTRIBUTES]);
    expect(content.attributes).toEqual({ color: 'Black' });
  });

  it('builds specifications with unit', () => {
    const { content } = engine.build(makeSource(), [ListingSection.SPECIFICATIONS]);
    expect(content.specifications?.['Resolution']).toBe('4K UHD');
  });

  it('builds search terms from aiSeo (deduped)', () => {
    const { content } = engine.build(makeSource(), [ListingSection.SEARCH_TERMS]);
    expect(content.searchTerms).toContain('sony tv');
    expect(content.searchTerms).toContain('bravia');
  });

  it('builds pricing from catalogProduct', () => {
    const { content } = engine.build(makeSource(), [ListingSection.PRICING]);
    expect(content.pricing?.sellingPrice).toBe(799.99);
    expect(content.pricing?.costPrice).toBe(400);
  });

  it('builds SEO metadata from aiSeo', () => {
    const { content } = engine.build(makeSource(), [ListingSection.SEO]);
    expect(content.seo?.metaTitle).toBe('SEO Title');
  });

  it('only builds requested sections', () => {
    const { content } = engine.build(makeSource(), [ListingSection.TITLE, ListingSection.BRAND]);
    expect(content.title).toBeDefined();
    expect(content.brand).toBeDefined();
    expect(content.description).toBeUndefined();
    expect(content.images).toBeUndefined();
  });

  it('returns null pricing when no price in catalogProduct', () => {
    const source = makeSource({
      catalogProduct: { ...makeSource().catalogProduct, suggestedSellingPrice: undefined },
    });
    const { content } = engine.build(source, [ListingSection.PRICING]);
    expect(content.pricing).toBeNull();
  });

  it('builds all sections when all are requested', () => {
    const { content } = engine.build(makeSource(), Object.values(ListingSection));
    expect(content.title).toBeDefined();
    expect(content.brand).toBeDefined();
    expect(content.images).toBeDefined();
    expect(content.pricing).toBeDefined();
  });
});
