/**
 * Listing Module Integration Tests – mocked dependencies, no live APIs or DB.
 */
import { ListingBuilderEngine } from '../engine/listing-builder.engine';
import { ListingQualityEngine } from '../engine/listing-quality.engine';
import { ListingSection, ListingContent } from '../interfaces';
import { PricingCalculationEngine } from '../../pricing/engines/pricing-calculation.engine';
import { PricingStrategy, IPricingConfig } from '../../pricing/interfaces';

// ── Helpers ───────────────────────────────────────────────────

function makeCatalogProduct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    productName: 'Wireless Headphones XB900',
    brand: 'Sony',
    category: 'Audio',
    description: 'Premium wireless headphones with noise cancellation.',
    suggestedSellingPrice: 249.99,
    targetSellingPrice: 299.99,
    totalLandedCostUsd: 80,
    variants: [
      { variantId: 'v1', sku: 'XB900-BLK', name: 'Black', attributes: { color: 'Black' }, suggestedSellingPrice: 249.99 },
      { variantId: 'v2', sku: 'XB900-WHT', name: 'White', attributes: { color: 'White' }, suggestedSellingPrice: 249.99 },
    ],
    attributes: [{ name: 'color', value: 'Black' }, { name: 'connectivity', value: 'Bluetooth 5.0' }],
    specifications: [
      { name: 'Battery Life', value: '30', unit: 'hours' },
      { name: 'Driver Size', value: '40mm' },
    ],
    ...overrides,
  };
}

function makeAiDescription(): Record<string, unknown> {
  return {
    generatedContent: {
      mainDescription: 'Experience premium sound with Sony WH-XB900N noise-cancelling headphones.',
      bulletPoints: [
        'Extra Bass sound technology',
        '30-hour battery life',
        'Multipoint connection — pair 2 devices simultaneously',
        'Foldable design for easy storage',
      ],
    },
  };
}

function makeAiSeo(): Record<string, unknown> {
  return {
    optimizedContent: {
      productTitle: 'Sony WH-XB900N Wireless Noise Cancelling Headphones',
      backendSearchTerms: ['sony headphones', 'noise cancelling', 'wireless headphones'],
      searchKeywords: ['bluetooth headphones', 'sony xb900'],
      metaTitle: 'Buy Sony WH-XB900N | Best Noise Cancelling Headphones',
      metaDescription: 'Shop Sony WH-XB900N wireless headphones with 30hr battery and Extra Bass.',
    },
  };
}

function makeAiImageSet(): Record<string, unknown> {
  return {
    generatedImages: [
      { imageId: 'img1', url: 'https://cdn.sony.com/hd1.jpg', status: 'APPROVED', imageType: 'MAIN' },
      { imageId: 'img2', url: 'https://cdn.sony.com/hd2.jpg', status: 'APPROVED', imageType: 'LIFESTYLE' },
      { imageId: 'img3', url: 'https://cdn.sony.com/hd3.jpg', status: 'MANUALLY_UPLOADED', imageType: 'DETAIL' },
    ],
  };
}

function makePricingConfig(): IPricingConfig {
  return {
    id: 'cfg-audio',
    workspaceId: 'ws1',
    marketplaceKey: 'AMAZON',
    country: 'US',
    currency: 'USD',
    strategy: PricingStrategy.MARGIN_BASED,
    isDefault: true,
    isActive: true,
    feeComponents: {
      commissionPct: 12,
      fulfilmentFeeFlat: 4.50,
      paymentProcessingPct: 2.9,
      packagingCostFlat: 1.0,
      advertisingCostPct: 6,
      taxPct: 0,
    },
    thresholds: {
      targetMarginPct: 35,
      targetRoi: 60,
      minMarginPct: 20,
      minProfitFlat: 20,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('Listing + Pricing Engine – Integration Tests', () => {
  let builderEngine: ListingBuilderEngine;
  let qualityEngine: ListingQualityEngine;
  let pricingEngine: PricingCalculationEngine;

  beforeEach(() => {
    builderEngine = new ListingBuilderEngine();
    qualityEngine = new ListingQualityEngine();
    pricingEngine = new PricingCalculationEngine();
  });

  // ── Universal Listing Generation ──────────────────────────────

  describe('universal listing generation pipeline', () => {
    it('builds complete content from all AI sources', () => {
      const { content } = builderEngine.build(
        {
          catalogProduct: makeCatalogProduct(),
          aiDescription: makeAiDescription(),
          aiSeo: makeAiSeo(),
          aiImageSet: makeAiImageSet(),
        },
        Object.values(ListingSection),
      );

      expect(content.title).toBe('Sony WH-XB900N Wireless Noise Cancelling Headphones');
      expect(content.brand).toBe('Sony');
      expect(content.category).toBe('Audio');
      expect(content.description).toContain('Experience premium sound');
      expect(content.bulletPoints).toHaveLength(4);
      expect(content.images).toHaveLength(3);
      expect(content.variants).toHaveLength(2);
      expect(content.searchTerms).toContain('sony headphones');
      expect(content.seo?.metaTitle).toContain('Sony');
    });

    it('achieves high quality score for complete content', () => {
      const { content } = builderEngine.build(
        {
          catalogProduct: makeCatalogProduct(),
          aiDescription: makeAiDescription(),
          aiSeo: makeAiSeo(),
          aiImageSet: makeAiImageSet(),
        },
        Object.values(ListingSection),
      );
      const result = qualityEngine.validate(content);
      expect(result.qualityScore).toBeGreaterThan(85);
      expect(result.isComplete).toBe(true);
      expect(result.missingAttributes.filter((m) => m.severity === 'REQUIRED')).toHaveLength(0);
    });
  });

  // ── Partial Regeneration ──────────────────────────────────────

  describe('partial section regeneration', () => {
    it('merges regenerated sections with existing content', () => {
      const existing: ListingContent = {
        title: 'Old Title',
        brand: 'Sony',
        category: 'Audio',
        description: 'Old Description',
        images: [{ imageId: 'img0', url: 'https://old.com/0.jpg', isPrimary: true, position: 1, type: 'MAIN' }],
        pricing: { sellingPrice: 249.99, currency: 'USD' },
      };

      const { content: newTitle } = builderEngine.build(
        { catalogProduct: makeCatalogProduct(), aiSeo: makeAiSeo() },
        [ListingSection.TITLE, ListingSection.SEARCH_TERMS],
      );

      const merged: ListingContent = { ...existing, ...newTitle };
      expect(merged.title).toBe('Sony WH-XB900N Wireless Noise Cancelling Headphones');
      expect(merged.images).toHaveLength(1); // Old images preserved
    });
  });

  // ── Quality Score Scenarios ───────────────────────────────────

  describe('quality score calculation', () => {
    it('empty content produces 0 quality score', () => {
      const result = qualityEngine.validate({});
      expect(result.qualityScore).toBe(0);
    });

    it('content without images has lower score', () => {
      const { content } = builderEngine.build(
        { catalogProduct: makeCatalogProduct(), aiDescription: makeAiDescription(), aiSeo: makeAiSeo() },
        Object.values(ListingSection),
      );
      const result = qualityEngine.validate({ ...content, images: [] });
      expect(result.qualityScore).toBeLessThan(90);
      expect(result.warnings.some((w) => w.includes('images'))).toBe(true);
    });

    it('content without SEO produces warning', () => {
      const { content } = builderEngine.build(
        { catalogProduct: makeCatalogProduct() },
        [ListingSection.TITLE, ListingSection.DESCRIPTION],
      );
      const result = qualityEngine.validate(content);
      expect(result.warnings.some((w) => w.includes('SEO'))).toBe(true);
    });
  });

  // ── Pricing Reference in Listing ─────────────────────────────

  describe('pricing reference in universal listing', () => {
    it('pricing reference is built from catalog product', () => {
      const { content } = builderEngine.build(
        { catalogProduct: makeCatalogProduct() },
        [ListingSection.PRICING],
      );
      expect(content.pricing?.sellingPrice).toBe(249.99);
      expect(content.pricing?.currency).toBe('USD');
    });

    it('pricing calc engine can price the listing independently', () => {
      const pricingResult = pricingEngine.calculate(
        {
          catalogProductId: 'prod1',
          workspaceId: 'ws1',
          marketplaceKey: 'AMAZON',
          landedCost: 80,
        },
        makePricingConfig(),
        PricingStrategy.MARGIN_BASED,
      );
      expect(pricingResult.marketplaceSellingPrice).toBeGreaterThan(80);
      expect(pricingResult.estimatedMarginPct).toBeGreaterThanOrEqual(20);
    });

    it('pricing engine and listing engine are independent', () => {
      const { content } = builderEngine.build(
        { catalogProduct: makeCatalogProduct() },
        [ListingSection.PRICING],
      );

      const pricingResult = pricingEngine.calculate(
        {
          catalogProductId: 'prod1', workspaceId: 'ws1', marketplaceKey: 'AMAZON',
          landedCost: 80,
        },
        makePricingConfig(),
      );

      // Pricing reference in listing is just the catalog price (display)
      // Actual marketplace pricing is independently computed
      expect(content.pricing?.sellingPrice).toBeDefined();
      expect(pricingResult.marketplaceSellingPrice).toBeDefined();
      // They are separate values
      expect(content.pricing?.sellingPrice).not.toEqual(pricingResult.marketplaceSellingPrice);
    });
  });

  // ── Workspace Isolation ───────────────────────────────────────

  describe('workspace isolation', () => {
    it('builder engine is stateless — no workspace leakage', () => {
      const { content: ws1 } = builderEngine.build(
        { catalogProduct: { ...makeCatalogProduct(), brand: 'BrandA' } },
        [ListingSection.BRAND],
      );
      const { content: ws2 } = builderEngine.build(
        { catalogProduct: { ...makeCatalogProduct(), brand: 'BrandB' } },
        [ListingSection.BRAND],
      );
      expect(ws1.brand).toBe('BrandA');
      expect(ws2.brand).toBe('BrandB');
    });
  });
});
