/**
 * Integration test: end-to-end transformation pipeline using mocked schemas.
 * No live marketplace APIs are called.
 */
import { TransformationEngine } from '../engines/transformation.engine';
import { CategoryMappingEngine } from '../engines/category-mapping.engine';
import { AttributeMappingEngine } from '../engines/attribute-mapping.engine';
import { VariantMappingEngine } from '../engines/variant-mapping.engine';
import { ContentRuleEngine } from '../engines/content-rule.engine';
import { MediaMappingEngine } from '../engines/media-mapping.engine';
import { ValidationRuleEngine } from '../engines/validation-rule.engine';
import { MarketplaceMappingRegistry } from '../registry/marketplace-mapping.registry';
import { MarketplaceMappingFactory } from '../registry/marketplace-mapping.factory';
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
  MarketplaceReadiness,
} from '../interfaces';

// ── Mocked Schemas ────────────────────────────────────────────

const AMAZON_SCHEMA: IMarketplaceSchema = {
  id: 'amazon-schema',
  workspaceId: null,
  marketplaceKey: 'AMAZON',
  country: 'US',
  locale: 'en-US',
  currency: 'USD',
  schemaVersion: '2.0.0',
  status: MappingStatus.PUBLISHED,
  isDefault: true,
  requiredFields: [
    { name: 'title', label: 'Product Title', type: FieldType.STRING, required: true, maxLength: 200 },
    { name: 'brand', label: 'Brand Name', type: FieldType.STRING, required: true },
    { name: 'category', label: 'Category', type: FieldType.STRING, required: true },
  ],
  optionalFields: [
    { name: 'description', label: 'Description', type: FieldType.STRING, required: false, maxLength: 2000 },
    { name: 'bulletPoints', label: 'Bullet Points', type: FieldType.ARRAY, required: false },
    { name: 'price', label: 'Price', type: FieldType.NUMBER, required: false, minValue: 0.01 },
    { name: 'currency', label: 'Currency', type: FieldType.ENUM, required: false, allowedValues: ['USD', 'EUR', 'CAD'] },
    { name: 'searchTerms', label: 'Search Keywords', type: FieldType.ARRAY, required: false },
    { name: 'color_name', label: 'Color', type: FieldType.STRING, required: false },
    { name: 'size_name', label: 'Size', type: FieldType.STRING, required: false },
    { name: 'weight_lbs', label: 'Weight (lbs)', type: FieldType.NUMBER, required: false },
  ],
  mediaRequirements: {
    primaryImage: true, minImages: 1, maxImages: 9,
    allowedFormats: ['JPEG', 'JPG', 'PNG'], maxFileSizeKb: 10_000,
    minWidth: 500, minHeight: 500, videoAllowed: true, maxVideos: 1,
    altTextRequired: false, variantImagesAllowed: true,
  },
  variantRules: {
    supported: true, structure: VariantStructureType.PARENT_CHILD,
    maxVariants: 50, allowedThemes: ['SIZE', 'COLOR'],
    requiresParentSku: true, maxAttributesPerVariant: 3,
  },
  contentRules: {
    maxTitleLength: 200, maxBulletPoints: 5, maxBulletLength: 200,
    maxDescriptionLength: 2000, htmlInDescription: false,
    maxSearchTerms: 5, maxSearchTermLength: 50,
    allowCapitalization: true, allowPromotionalText: false,
    allowSpecialChars: false, brandInTitle: false,
    restrictedWords: ['cheapest', 'free'],
    prohibitedClaims: ['cures all'],
  },
  pricingRequirements: {
    required: true, allowedCurrencies: ['USD', 'EUR', 'CAD'],
    requiresCompareAtPrice: false, requiresShippingPrice: false,
  },
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Mocked Mappings ───────────────────────────────────────────

const CATEGORY_MAPPINGS: ICategoryMapping[] = [
  {
    id: 'cm1', workspaceId: 'ws1', schemaId: null,
    universalCategory: 'Electronics', marketplaceKey: 'AMAZON', country: 'US',
    marketplaceCategory: 'Electronics & Accessories', marketplaceCategoryId: '172282',
    categoryPath: 'Electronics > TVs > Smart TVs', confidence: 95,
    status: CategoryMappingStatus.MANUALLY_MAPPED, isManualOverride: true,
    version: 1, createdBy: null, updatedBy: null, createdAt: new Date(), updatedAt: new Date(),
  },
];

const ATTRIBUTE_MAPPINGS: IAttributeMapping[] = [
  {
    id: 'am1', workspaceId: 'ws1', schemaId: null,
    marketplaceKey: 'AMAZON', country: 'US',
    universalAttribute: 'color', marketplaceAttribute: 'color_name',
    transformType: AttributeTransformType.ENUM_MAP,
    valueMapping: { black: 'Jet Black', silver: 'Silver / Metallic', white: 'Pearl White' },
    unitConversion: null, defaultValue: 'Other',
    isRequired: false, isManualOverride: false, conditions: null, derivedExpression: null,
    version: 1, status: MappingStatus.PUBLISHED, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'am2', workspaceId: 'ws1', schemaId: null,
    marketplaceKey: 'AMAZON', country: 'US',
    universalAttribute: 'size', marketplaceAttribute: 'size_name',
    transformType: AttributeTransformType.DIRECT,
    valueMapping: null, unitConversion: null, defaultValue: null,
    isRequired: false, isManualOverride: false, conditions: null, derivedExpression: null,
    version: 1, status: MappingStatus.PUBLISHED, createdAt: new Date(), updatedAt: new Date(),
  },
  {
    id: 'am3', workspaceId: 'ws1', schemaId: null,
    marketplaceKey: 'AMAZON', country: 'US',
    universalAttribute: 'weight', marketplaceAttribute: 'weight_lbs',
    transformType: AttributeTransformType.UNIT_CONVERT,
    valueMapping: null,
    unitConversion: { fromUnit: 'kg', toUnit: 'lbs', factor: 2.20462 },
    defaultValue: null, isRequired: false, isManualOverride: false,
    conditions: null, derivedExpression: null,
    version: 1, status: MappingStatus.PUBLISHED, createdAt: new Date(), updatedAt: new Date(),
  },
];

const FULL_INPUT: UniversalListingInput = {
  listingId: 'lst-001',
  workspaceId: 'ws1',
  catalogProductId: 'prod-001',
  product: { id: 'prod-001', name: 'Sony BRAVIA', sku: 'SONY-BRAVIA-55' },
  brand: 'Sony',
  category: 'Electronics',
  title: 'Sony BRAVIA 55" 4K UHD Smart TV',
  description: 'Experience true-to-life picture quality with Sony BRAVIA.',
  bulletPoints: [
    '4K Ultra HD Resolution',
    'X1 Processor for stunning clarity',
    'Google TV built-in',
    'Works with Alexa',
    '3 HDMI ports',
  ],
  searchTerms: ['sony tv', '4k tv', 'smart tv', 'bravia', 'oled'],
  images: [
    {
      id: 'img1', url: 'https://cdn.sony.com/tv1.jpg', isPrimary: true,
      position: 1, format: 'JPEG', fileSizeKb: 800, width: 2000, height: 2000,
    },
    {
      id: 'img2', url: 'https://cdn.sony.com/tv2.jpg', isPrimary: false,
      position: 2, format: 'JPEG', fileSizeKb: 600, width: 1500, height: 1500,
    },
  ],
  videos: [],
  attributes: { color: 'black', size: '55"', weight: '18.5' },
  specifications: {},
  pricingReference: { sellingPrice: 799.99, compareAtPrice: 999.99, currency: 'USD' },
  variants: [
    { id: 'v1', sku: 'SONY-BRAVIA-55-BLK', name: '55" Black', attributes: { size: '55"', color: 'Black' }, price: 799.99, stockQty: 50 },
    { id: 'v2', sku: 'SONY-BRAVIA-65-BLK', name: '65" Black', attributes: { size: '65"', color: 'Black' }, price: 999.99, stockQty: 30 },
  ],
  weight: { value: 18.5, unit: 'kg' },
  dimensions: { length: 122, width: 72, height: 8, unit: 'cm' },
};

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

function makeFactory(engine: TransformationEngine) {
  const registry = new MarketplaceMappingRegistry();
  const validationEngine = new ValidationRuleEngine();
  return new MarketplaceMappingFactory(registry, engine, validationEngine);
}

describe('Marketplace Listing Mapping – Integration Tests', () => {
  let engine: TransformationEngine;
  let factory: MarketplaceMappingFactory;

  beforeEach(() => {
    engine = makeEngine();
    factory = makeFactory(engine);
  });

  // ── Full Pipeline ─────────────────────────────────────────

  it('full pipeline: transforms a complete listing successfully', () => {
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );

    expect(result.status).toBe(TransformationStatus.COMPLETED);
    expect(result.listingId).toBe('lst-001');
    expect(result.payload['title']).toBe('Sony BRAVIA 55" 4K UHD Smart TV');
    expect(result.payload['brand']).toBe('Sony');
    expect(result.payload['category']).toBe('Electronics & Accessories');
    expect(result.payload['price']).toBe(799.99);
    expect((result.payload['images'] as unknown[]).length).toBeGreaterThanOrEqual(1);
    expect((result.payload['variants'] as unknown[]).length).toBe(2);
  });

  it('enum mapping: color "black" → "Jet Black"', () => {
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );
    const attrs = result.payload['attributes'] as Record<string, unknown>;
    expect(attrs['color_name']).toBe('Jet Black');
  });

  it('unit conversion: weight 18.5kg → ~40.78 lbs', () => {
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );
    const attrs = result.payload['attributes'] as Record<string, unknown>;
    expect(attrs['weight_lbs']).toBeCloseTo(40.78, 1);
  });

  it('content rules: strips HTML from description', () => {
    const inputWithHtml = { ...FULL_INPUT, description: '<p>Great <b>product</b></p>' };
    const result = engine.transform(inputWithHtml, AMAZON_SCHEMA, [], []);
    expect(result.payload['description']).not.toContain('<p>');
    expect(result.payload['description']).toContain('Great');
  });

  it('content rules: detects restricted word in content errors', () => {
    const inputWithRestricted = { ...FULL_INPUT, title: 'Buy cheapest TV' };
    const result = engine.transform(inputWithRestricted, AMAZON_SCHEMA, [], []);
    expect(result.errors.some((e) => e.message.includes('cheapest'))).toBe(true);
  });

  it('dry-run: marks result as dryRun and still produces payload', () => {
    const result = factory.createPreview(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );
    expect(result.isDryRun).toBe(true);
    expect(result.payload['title']).toBe('Sony BRAVIA 55" 4K UHD Smart TV');
  });

  it('validation: produces readiness score for complete payload', () => {
    const transformResult = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );
    const validationResult = factory.validate(transformResult.payload, AMAZON_SCHEMA);
    expect(validationResult.readinessScore).toBeGreaterThan(60);
  });

  it('field trace: every key field has a trace entry', () => {
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      CATEGORY_MAPPINGS,
      ATTRIBUTE_MAPPINGS,
    );
    const traced = result.fieldTrace.map((t) => t.marketplaceField);
    expect(traced).toContain('title');
    expect(traced).toContain('brand');
    expect(traced).toContain('category');
    expect(traced).toContain('images');
  });

  it('workspace overrides: category mapping prefers workspace-specific', () => {
    const workspaceCategoryMapping: ICategoryMapping = {
      ...CATEGORY_MAPPINGS[0]!,
      id: 'cm-ws',
      workspaceId: 'ws1',
      marketplaceCategory: 'WS Electronics',
    };
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      [CATEGORY_MAPPINGS[0]!, workspaceCategoryMapping],
      [],
    );
    expect(result.payload['category']).toBe('WS Electronics');
  });

  it('partial transformation: TITLE + BRAND only', () => {
    const result = engine.transform(
      FULL_INPUT,
      AMAZON_SCHEMA,
      [],
      [],
      { sections: ['TITLE' as never, 'BRAND' as never] },
    );
    expect(result.payload['title']).toBeDefined();
    expect(result.payload['brand']).toBeDefined();
    expect(result.payload['images']).toBeUndefined();
    expect(result.payload['variants']).toBeUndefined();
  });

  it('error normalization: missing required fields → readiness NOT_READY', () => {
    const minimalInput: UniversalListingInput = {
      listingId: 'lst-empty',
      workspaceId: 'ws1',
      catalogProductId: 'prod-empty',
    };
    const result = engine.transform(minimalInput, AMAZON_SCHEMA, [], []);
    const validationResult = factory.validate(result.payload, AMAZON_SCHEMA);
    expect(validationResult.readinessStatus).toBe(MarketplaceReadiness.NOT_READY);
    expect(validationResult.missingFields.filter((f) => f.required).length).toBeGreaterThan(0);
  });

  it('immutability: original input not modified after transform', () => {
    const input = { ...FULL_INPUT, title: 'Original Title' };
    engine.transform(input, AMAZON_SCHEMA, CATEGORY_MAPPINGS, ATTRIBUTE_MAPPINGS);
    expect(input.title).toBe('Original Title');
    expect(input.images).toHaveLength(2);
  });
});
