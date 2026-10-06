import { TransformationEngine } from '../engines/transformation.engine';
import { CategoryMappingEngine } from '../engines/category-mapping.engine';
import { AttributeMappingEngine } from '../engines/attribute-mapping.engine';
import { VariantMappingEngine } from '../engines/variant-mapping.engine';
import { ContentRuleEngine } from '../engines/content-rule.engine';
import { MediaMappingEngine } from '../engines/media-mapping.engine';
import { ValidationRuleEngine } from '../engines/validation-rule.engine';
import {
  IMarketplaceSchema,
  ICategoryMapping,
  IAttributeMapping,
  UniversalListingInput,
  MappingStatus,
  FieldType,
  VariantStructureType,
  TransformationStatus,
  AttributeTransformType,
  CategoryMappingStatus,
} from '../interfaces';

function makeEngine() {
  return new TransformationEngine(
    new CategoryMappingEngine(),
    new AttributeMappingEngine(),
    new VariantMappingEngine(),
    new ContentRuleEngine(),
    new MediaMappingEngine(),
    new ValidationRuleEngine(),
  );
}

function makeSchema(): IMarketplaceSchema {
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
    ],
    optionalFields: [
      { name: 'description', label: 'Description', type: FieldType.STRING, required: false },
      { name: 'price', label: 'Price', type: FieldType.NUMBER, required: false },
    ],
    mediaRequirements: {
      primaryImage: true, minImages: 1, maxImages: 9,
      allowedFormats: ['JPEG', 'PNG'], maxFileSizeKb: 10_000,
      minWidth: 500, minHeight: 500, videoAllowed: false,
      altTextRequired: false, variantImagesAllowed: true,
    },
    variantRules: {
      supported: true, structure: VariantStructureType.PARENT_CHILD,
      maxVariants: 10, allowedThemes: ['SIZE', 'COLOR'],
      requiresParentSku: false, maxAttributesPerVariant: 5,
    },
    contentRules: {
      maxTitleLength: 200, maxBulletPoints: 5, maxBulletLength: 500,
      maxDescriptionLength: 2000, htmlInDescription: false,
      maxSearchTerms: 5, maxSearchTermLength: 50,
      allowCapitalization: true, allowPromotionalText: true,
      allowSpecialChars: true, brandInTitle: false,
    },
    pricingRequirements: {
      required: false, allowedCurrencies: ['USD', 'EUR'],
      requiresCompareAtPrice: false, requiresShippingPrice: false,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeInput(overrides: Partial<UniversalListingInput> = {}): UniversalListingInput {
  return {
    listingId: 'lst1',
    workspaceId: 'ws1',
    catalogProductId: 'prod1',
    title: 'Sony BRAVIA 55" 4K TV',
    brand: 'Sony',
    category: 'Electronics',
    description: 'Amazing picture quality',
    bulletPoints: ['4K UHD', 'HDR10', 'Smart TV'],
    searchTerms: ['sony', 'tv', '4k'],
    images: [
      {
        id: 'img1', url: 'https://img.example.com/1.jpg', isPrimary: true,
        position: 1, format: 'JPEG', fileSizeKb: 200, width: 1000, height: 1000,
      },
    ],
    attributes: { color: 'Black' },
    specifications: {},
    pricingReference: { sellingPrice: 499.99, currency: 'USD' },
    variants: [
      { id: 'v1', sku: 'SKU-55', name: '55 inch', attributes: { size: '55"' }, price: 499.99 },
    ],
    ...overrides,
  };
}

const categoryMappings: ICategoryMapping[] = [
  {
    id: 'cm1', workspaceId: 'ws1', schemaId: null,
    universalCategory: 'Electronics', marketplaceKey: 'AMAZON', country: 'US',
    marketplaceCategory: 'Electronics & Accessories', marketplaceCategoryId: '172282',
    categoryPath: 'Electronics', confidence: 95,
    status: CategoryMappingStatus.MANUALLY_MAPPED, isManualOverride: true,
    version: 1, createdBy: null, updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
  },
];

const attributeMappings: IAttributeMapping[] = [
  {
    id: 'am1', workspaceId: 'ws1', schemaId: null,
    marketplaceKey: 'AMAZON', country: 'US',
    universalAttribute: 'color', marketplaceAttribute: 'color_name',
    transformType: AttributeTransformType.DIRECT,
    valueMapping: null, unitConversion: null, defaultValue: null,
    isRequired: false, isManualOverride: false,
    conditions: null, derivedExpression: null, version: 1,
    status: MappingStatus.PUBLISHED, createdAt: new Date(), updatedAt: new Date(),
  },
];

describe('TransformationEngine', () => {
  let engine: TransformationEngine;
  const schema = makeSchema();

  beforeEach(() => {
    engine = makeEngine();
  });

  // ── Full Transformation ───────────────────────────────────

  describe('transform()', () => {
    it('produces COMPLETED status for valid input', () => {
      const result = engine.transform(makeInput(), schema, categoryMappings, attributeMappings);
      expect(result.status).toBe(TransformationStatus.COMPLETED);
      expect(result.payload['title']).toBe('Sony BRAVIA 55" 4K TV');
    });

    it('maps brand into payload', () => {
      const result = engine.transform(makeInput(), schema, categoryMappings, attributeMappings);
      expect(result.payload['brand']).toBe('Sony');
    });

    it('maps category using categoryMappings', () => {
      const result = engine.transform(makeInput(), schema, categoryMappings, attributeMappings);
      expect(result.payload['category']).toBe('Electronics & Accessories');
    });

    it('maps pricing into payload', () => {
      const result = engine.transform(makeInput(), schema, [], []);
      expect(result.payload['price']).toBe(499.99);
      expect(result.payload['currency']).toBe('USD');
    });

    it('maps images into payload', () => {
      const result = engine.transform(makeInput(), schema, [], []);
      const images = result.payload['images'] as { url: string }[];
      expect(images).toHaveLength(1);
      expect(images[0]!.url).toBe('https://img.example.com/1.jpg');
    });

    it('maps variants into payload', () => {
      const result = engine.transform(makeInput(), schema, [], []);
      const variants = result.payload['variants'] as { childSku: string }[];
      expect(variants).toHaveLength(1);
      expect(variants[0]!.childSku).toBe('SKU-55');
    });

    it('maps attributes through attribute mappings', () => {
      const result = engine.transform(makeInput(), schema, [], attributeMappings);
      const attrs = result.payload['attributes'] as Record<string, unknown>;
      expect(attrs['color_name']).toBe('Black');
    });

    it('reports unmapped attributes as warnings', () => {
      const input = makeInput({ attributes: { unknownAttr: 'value' } });
      const result = engine.transform(input, schema, [], []);
      expect(result.warnings.some((w) => w.message.includes('unknownAttr'))).toBe(true);
    });

    it('adds warning when category mapping missing', () => {
      const result = engine.transform(
        makeInput({ category: 'Unknown Category' }),
        schema, [], [],
      );
      expect(result.warnings.some((w) => w.code === 'CATEGORY_MAPPING_MISSING')).toBe(true);
    });

    it('produces field trace for every mapped field', () => {
      const result = engine.transform(makeInput(), schema, categoryMappings, attributeMappings);
      const fields = result.fieldTrace.map((t) => t.marketplaceField);
      expect(fields).toContain('title');
      expect(fields).toContain('brand');
    });

    it('does not modify original input object', () => {
      const input = makeInput();
      const originalTitle = input.title;
      engine.transform(input, schema, [], []);
      expect(input.title).toBe(originalTitle);
    });
  });

  // ── Partial Transformation ────────────────────────────────

  describe('partial transformation (sections)', () => {
    it('only transforms specified sections', () => {
      const result = engine.transform(
        makeInput(),
        schema,
        [],
        [],
        { sections: ['TITLE' as never] },
      );
      expect(result.payload['title']).toBeDefined();
      expect(result.payload['brand']).toBeUndefined();
      expect(result.payload['images']).toBeUndefined();
    });
  });

  // ── Dry Run ───────────────────────────────────────────────

  describe('dryRun()', () => {
    it('marks result as dry run', () => {
      const result = engine.dryRun(makeInput(), schema, [], []);
      expect(result.isDryRun).toBe(true);
    });

    it('still produces a valid payload in dry run', () => {
      const result = engine.dryRun(makeInput(), schema, categoryMappings, []);
      expect(result.payload['title']).toBe('Sony BRAVIA 55" 4K TV');
    });
  });

  // ── Error Handling ────────────────────────────────────────

  describe('error normalization', () => {
    it('returns FAILED status and error info on unexpected failure', () => {
      const brokenEngine = new TransformationEngine(
        { resolve: () => { throw new Error('boom'); } } as never,
        new AttributeMappingEngine(),
        new VariantMappingEngine(),
        new ContentRuleEngine(),
        new MediaMappingEngine(),
        new ValidationRuleEngine(),
      );
      const result = brokenEngine.transform(
        makeInput({ category: 'Electronics' }),
        schema,
        [categoryMappings[0]!],
        [],
      );
      expect(result.status).toBe(TransformationStatus.FAILED);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ── Workspace Overrides ────────────────────────────────────

  describe('workspace overrides', () => {
    it('accepts workspaceOverrides option without crashing', () => {
      const result = engine.transform(
        makeInput(),
        schema,
        [],
        [],
        { workspaceOverrides: { title: 'Custom Title Override' } },
      );
      expect(result.status).not.toBe(TransformationStatus.FAILED);
    });
  });

  // ── Version Selection ──────────────────────────────────────

  describe('schema version', () => {
    it('uses schema version in transformation result', () => {
      const result = engine.transform(makeInput(), schema, [], []);
      expect(result.schemaVersion).toBe('1.0.0');
    });
  });
});
