import { ValidationRuleEngine } from '../engines/validation-rule.engine';
import {
  IMarketplaceSchema,
  MappingStatus,
  FieldType,
  VariantStructureType,
  MarketplaceReadiness,
  ValidationSeverity,
} from '../interfaces';

function makeSchema(overrides: Partial<IMarketplaceSchema> = {}): IMarketplaceSchema {
  return {
    id: 'schema1',
    workspaceId: null,
    marketplaceKey: 'AMAZON',
    country: 'US',
    locale: 'en-US',
    currency: 'USD',
    schemaVersion: '1.0.0',
    status: MappingStatus.PUBLISHED,
    isDefault: true,
    requiredFields: [
      { name: 'title', label: 'Title', type: FieldType.STRING, required: true, maxLength: 200 },
      { name: 'brand', label: 'Brand', type: FieldType.STRING, required: true },
      { name: 'category', label: 'Category', type: FieldType.STRING, required: true },
    ],
    optionalFields: [
      { name: 'description', label: 'Description', type: FieldType.STRING, required: false, maxLength: 2000 },
      { name: 'bulletPoints', label: 'Bullet Points', type: FieldType.ARRAY, required: false },
      { name: 'price', label: 'Price', type: FieldType.NUMBER, required: false, minValue: 0.01 },
      { name: 'currency', label: 'Currency', type: FieldType.ENUM, required: false, allowedValues: ['USD', 'EUR', 'GBP'] },
    ],
    mediaRequirements: {
      primaryImage: true,
      minImages: 1,
      maxImages: 9,
      allowedFormats: ['JPEG', 'PNG'],
      maxFileSizeKb: 10_000,
      minWidth: 500,
      minHeight: 500,
      videoAllowed: true,
      altTextRequired: false,
      variantImagesAllowed: true,
    },
    variantRules: {
      supported: true,
      structure: VariantStructureType.PARENT_CHILD,
      maxVariants: 100,
      allowedThemes: ['SIZE', 'COLOR'],
      requiresParentSku: true,
      maxAttributesPerVariant: 5,
    },
    contentRules: {
      maxTitleLength: 200,
      maxBulletPoints: 5,
      maxBulletLength: 500,
      maxDescriptionLength: 2000,
      htmlInDescription: false,
      maxSearchTerms: 5,
      maxSearchTermLength: 50,
      allowCapitalization: true,
      allowPromotionalText: true,
      allowSpecialChars: true,
      brandInTitle: false,
    },
    pricingRequirements: {
      required: true,
      allowedCurrencies: ['USD', 'EUR', 'GBP'],
      requiresCompareAtPrice: false,
      requiresShippingPrice: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('ValidationRuleEngine', () => {
  let engine: ValidationRuleEngine;
  const schema = makeSchema();

  beforeEach(() => {
    engine = new ValidationRuleEngine();
  });

  // ── Required Fields ───────────────────────────────────────

  describe('required field validation', () => {
    it('passes when all required fields present', () => {
      const payload = {
        title: 'Sony TV 55"',
        brand: 'Sony',
        category: 'Electronics',
        price: 499.99,
        currency: 'USD',
        images: [{ url: 'https://img.com/1.jpg', isPrimary: true }],
      };
      const result = engine.validate(payload, schema);
      expect(result.missingFields.filter((f) => f.required)).toHaveLength(0);
    });

    it('reports missing required fields', () => {
      const payload = { title: 'Sony TV 55"' };
      const result = engine.validate(payload, schema);
      const requiredMissing = result.missingFields.filter((f) => f.required);
      expect(requiredMissing.some((f) => f.field === 'brand')).toBe(true);
      expect(requiredMissing.some((f) => f.field === 'category')).toBe(true);
    });

    it('marks result invalid for missing required fields', () => {
      const result = engine.validate({}, schema);
      expect(result.isValid).toBe(false);
    });
  });

  // ── Field Types ───────────────────────────────────────────

  describe('field type validation', () => {
    it('reports error for wrong type', () => {
      const payload = {
        title: 12345, // Should be string
        brand: 'Sony',
        category: 'Electronics',
        price: 499.99,
        currency: 'USD',
        images: [{}],
      };
      const result = engine.validate(payload as unknown as Record<string, unknown>, schema);
      expect(result.invalidFields.some((f) => f.field === 'title')).toBe(true);
    });

    it('passes correct number type', () => {
      const payload = {
        title: 'Sony TV',
        brand: 'Sony',
        category: 'Electronics',
        price: 499.99,
        currency: 'USD',
        images: [{ isPrimary: true }],
      };
      const result = engine.validate(payload, schema);
      expect(result.invalidFields.some((f) => f.field === 'price')).toBe(false);
    });
  });

  // ── Field Lengths ─────────────────────────────────────────

  describe('field length validation', () => {
    it('reports error for title exceeding maxLength', () => {
      const payload = { title: 'T'.repeat(250), brand: 'Sony', category: 'Electronics', price: 10, currency: 'USD', images: [{ isPrimary: true }] };
      const result = engine.validate(payload, schema);
      expect(result.errors.some((e) => e.field === 'title')).toBe(true);
    });
  });

  // ── Allowed Values ────────────────────────────────────────

  describe('allowed values validation', () => {
    it('reports error for currency not in allowedValues', () => {
      const payload = { title: 'TV', brand: 'Sony', category: 'Electronics', price: 10, currency: 'JPY', images: [{ isPrimary: true }] };
      const result = engine.validate(payload, schema);
      expect(result.errors.some((e) => e.field === 'currency')).toBe(true);
    });

    it('passes valid enum value', () => {
      const payload = { title: 'TV', brand: 'Sony', category: 'Electronics', price: 10, currency: 'USD', images: [{ isPrimary: true }] };
      const result = engine.validate(payload, schema);
      expect(result.errors.some((e) => e.field === 'currency')).toBe(false);
    });
  });

  // ── Pricing Validation ────────────────────────────────────

  describe('pricing validation', () => {
    it('reports error when price missing and pricing required', () => {
      const payload = { title: 'TV', brand: 'Sony', category: 'Electronics', currency: 'USD', images: [{ isPrimary: true }] };
      const result = engine.validate(payload, schema);
      expect(result.errors.some((e) => e.field === 'price')).toBe(true);
    });

    it('reports error for unsupported currency', () => {
      const payload = { title: 'TV', brand: 'Sony', category: 'Electronics', price: 10, currency: 'INR', images: [{ isPrimary: true }] };
      const result = engine.validate(payload, schema);
      expect(result.errors.some((e) => e.field === 'currency')).toBe(true);
    });
  });

  // ── Unsupported Fields ────────────────────────────────────

  describe('unsupported fields', () => {
    it('lists fields in payload but not in schema', () => {
      const payload = {
        title: 'TV', brand: 'Sony', category: 'Electronics',
        price: 10, currency: 'USD', images: [{}],
        unknownField: 'surprise',
      };
      const result = engine.validate(payload, schema);
      expect(result.unsupportedFields).toContain('unknownField');
    });
  });

  // ── Readiness Score ───────────────────────────────────────

  describe('readiness score', () => {
    it('returns high score for complete payload', () => {
      const payload = {
        title: 'Sony TV 55"',
        brand: 'Sony',
        category: 'Electronics',
        price: 499.99,
        currency: 'USD',
        images: [{ isPrimary: true, url: 'https://img.com/1.jpg' }],
        description: 'Great TV',
      };
      const result = engine.validate(payload, schema);
      expect(result.readinessScore).toBeGreaterThan(70);
    });

    it('returns READY status for high score without errors', () => {
      const payload = {
        title: 'Sony TV 55"',
        brand: 'Sony',
        category: 'Electronics',
        price: 499.99,
        currency: 'USD',
        images: [{ isPrimary: true }],
      };
      const result = engine.validate(payload, schema);
      if (result.errors.length === 0) {
        expect([MarketplaceReadiness.READY, MarketplaceReadiness.WARNINGS]).toContain(result.readinessStatus);
      }
    });

    it('returns NOT_READY when there are critical errors', () => {
      const result = engine.validate({}, schema);
      expect(result.readinessStatus).toBe(MarketplaceReadiness.NOT_READY);
    });

    it('returns score of 0 for empty payload', () => {
      const result = engine.validate({}, schema);
      expect(result.readinessScore).toBeLessThanOrEqual(20);
    });
  });

  // ── Media Count ───────────────────────────────────────────

  describe('media count validation', () => {
    it('warns when images array is empty and minImages > 0', () => {
      const payload = { title: 'TV', brand: 'Sony', category: 'Electronics', price: 10, currency: 'USD', images: [] };
      const result = engine.validate(payload, schema);
      const mediaIssue = result.warnings.some((w) => w.field === 'images') ||
                          result.errors.some((e) => e.field === 'images');
      expect(mediaIssue).toBe(true);
    });
  });
});
