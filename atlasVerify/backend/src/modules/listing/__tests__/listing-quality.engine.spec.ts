import { ListingQualityEngine } from '../engine/listing-quality.engine';
import { ListingContent } from '../interfaces';

function makeFullContent(): ListingContent {
  return {
    title: 'Sony BRAVIA 55" 4K TV',
    brand: 'Sony',
    category: 'Electronics',
    description: 'Amazing TV with 4K resolution and smart features.',
    bulletPoints: ['4K Ultra HD', 'Smart TV', 'HDR10'],
    images: [
      { imageId: 'img1', url: 'https://cdn.com/1.jpg', isPrimary: true, position: 1, type: 'MAIN' },
    ],
    variants: [{ variantId: 'v1', sku: 'SKU-1', name: '55"', attributes: {} }],
    attributes: { color: 'Black' },
    specifications: { Resolution: '4K UHD' },
    searchTerms: ['sony', 'tv', '4k'],
    pricing: { sellingPrice: 799.99, currency: 'USD' },
    seo: { metaTitle: 'Buy Sony BRAVIA' },
  };
}

describe('ListingQualityEngine (marketplace-agnostic)', () => {
  let engine: ListingQualityEngine;

  beforeEach(() => {
    engine = new ListingQualityEngine();
  });

  it('produces high quality score for complete content', () => {
    const result = engine.validate(makeFullContent());
    expect(result.qualityScore).toBeGreaterThan(85);
    expect(result.isComplete).toBe(true);
  });

  it('marks as incomplete when required fields missing', () => {
    const { title: _t, brand: _b, ...rest } = makeFullContent();
    const result = engine.validate(rest as ListingContent);
    expect(result.isComplete).toBe(false);
    expect(result.missingAttributes.some((m) => m.field === 'title' && m.severity === 'REQUIRED')).toBe(true);
  });

  it('lower score for empty content', () => {
    const result = engine.validate({});
    expect(result.qualityScore).toBe(0);
    expect(result.isComplete).toBe(false);
  });

  it('no warnings for healthy content', () => {
    const result = engine.validate(makeFullContent());
    expect(result.warnings.filter((w) => w.includes('No images'))).toHaveLength(0);
  });

  it('warns on missing SEO', () => {
    const { seo: _s, ...rest } = makeFullContent();
    const result = engine.validate(rest as ListingContent);
    expect(result.warnings.some((w) => w.includes('SEO'))).toBe(true);
  });

  it('warns on empty images array', () => {
    const result = engine.validate({ ...makeFullContent(), images: [] });
    expect(result.warnings.some((w) => w.includes('No images'))).toBe(true);
  });

  it('warns when too many bullet points', () => {
    const result = engine.validate({
      ...makeFullContent(),
      bulletPoints: Array.from({ length: 11 }, (_, i) => `Bullet ${i}`),
    });
    expect(result.warnings.some((w) => w.includes('bullet points'))).toBe(true);
  });

  it('recommended fields add to score but not required', () => {
    const minimal: ListingContent = {
      title: 'Product',
      brand: 'Brand',
      category: 'Cat',
      description: 'Desc',
      images: [{ imageId: 'i1', url: 'u', isPrimary: true, position: 1, type: 'MAIN' }],
      pricing: { sellingPrice: 9.99, currency: 'USD' },
    };
    const result = engine.validate(minimal);
    expect(result.isComplete).toBe(true);
    expect(result.qualityScore).toBeLessThan(100); // missing recommended fields
  });
});
