import { MarketplaceMappingRegistry } from '../registry/marketplace-mapping.registry';
import { MarketplaceMappingFactory } from '../registry/marketplace-mapping.factory';
import { TransformationEngine } from '../engines/transformation.engine';
import { ValidationRuleEngine } from '../engines/validation-rule.engine';
import { CategoryMappingEngine } from '../engines/category-mapping.engine';
import { AttributeMappingEngine } from '../engines/attribute-mapping.engine';
import { VariantMappingEngine } from '../engines/variant-mapping.engine';
import { ContentRuleEngine } from '../engines/content-rule.engine';
import { MediaMappingEngine } from '../engines/media-mapping.engine';
import {
  IMarketplaceMappingAdapter,
  IMarketplaceSchema,
  MappingStatus,
  FieldType,
  VariantStructureType,
  MarketplaceContentRules,
  MarketplaceMediaRequirements,
  MarketplaceVariantRules,
} from '../interfaces';

function makeSchema(marketplaceKey = 'AMAZON'): IMarketplaceSchema {
  return {
    id: 'schema1',
    workspaceId: null,
    marketplaceKey,
    country: 'US',
    locale: 'en-US',
    currency: 'USD',
    schemaVersion: '1.0.0',
    status: MappingStatus.PUBLISHED,
    isDefault: true,
    requiredFields: [
      { name: 'title', label: 'Title', type: FieldType.STRING, required: true, maxLength: 200 },
    ],
    optionalFields: [],
    mediaRequirements: {
      primaryImage: true, minImages: 1, maxImages: 9,
      allowedFormats: ['JPEG', 'PNG'], maxFileSizeKb: 10_000,
      minWidth: 500, minHeight: 500, videoAllowed: false,
      altTextRequired: false, variantImagesAllowed: true,
    },
    variantRules: {
      supported: true, structure: VariantStructureType.PARENT_CHILD,
      maxVariants: 100, allowedThemes: ['SIZE', 'COLOR'],
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

class TestAdapter implements IMarketplaceMappingAdapter {
  readonly marketplaceKey = 'TESTMKT';

  getDefaultSchema(country: string, category?: string): Partial<IMarketplaceSchema> {
    return makeSchema('TESTMKT');
  }

  getDefaultContentRules(): MarketplaceContentRules {
    return makeSchema('TESTMKT').contentRules;
  }

  getDefaultMediaRequirements(): MarketplaceMediaRequirements {
    return makeSchema('TESTMKT').mediaRequirements;
  }

  getDefaultVariantRules(): MarketplaceVariantRules {
    return makeSchema('TESTMKT').variantRules;
  }
}

function makeFactory() {
  const registry = new MarketplaceMappingRegistry();
  const categoryEngine = new CategoryMappingEngine();
  const attributeEngine = new AttributeMappingEngine();
  const variantEngine = new VariantMappingEngine();
  const contentEngine = new ContentRuleEngine();
  const mediaEngine = new MediaMappingEngine();
  const validationEngine = new ValidationRuleEngine();
  const transformationEngine = new TransformationEngine(
    categoryEngine, attributeEngine, variantEngine,
    contentEngine, mediaEngine, validationEngine,
  );
  const factory = new MarketplaceMappingFactory(registry, transformationEngine, validationEngine);
  return { registry, factory, transformationEngine, validationEngine };
}

describe('MarketplaceMappingRegistry', () => {
  it('registers an adapter and retrieves it', () => {
    const { registry } = makeFactory();
    registry.register(new TestAdapter());
    expect(registry.has('TESTMKT')).toBe(true);
    expect(registry.get('TESTMKT')).toBeInstanceOf(TestAdapter);
  });

  it('is case-insensitive for marketplace key lookup', () => {
    const { registry } = makeFactory();
    registry.register(new TestAdapter());
    expect(registry.has('testmkt')).toBe(true);
    expect(registry.get('testMkt')).toBeDefined();
  });

  it('overwrites existing registration', () => {
    const { registry } = makeFactory();
    registry.register(new TestAdapter());
    const adapter2 = new TestAdapter();
    registry.register(adapter2);
    expect(registry.get('TESTMKT')).toBe(adapter2);
  });

  it('listKeys returns registered marketplace keys', () => {
    const { registry } = makeFactory();
    registry.register(new TestAdapter());
    expect(registry.listKeys()).toContain('TESTMKT');
  });

  it('returns fallback schema for unregistered marketplace', () => {
    const { registry } = makeFactory();
    const schema = registry.getDefaultSchema('UNKNOWN_MKT', 'US');
    expect(schema.marketplaceKey).toBe('UNKNOWN_MKT');
    expect(schema.requiredFields).toEqual([]);
  });

  it('delegates to adapter for registered marketplace', () => {
    const { registry } = makeFactory();
    registry.register(new TestAdapter());
    const schema = registry.getDefaultSchema('TESTMKT', 'US');
    expect(schema.marketplaceKey).toBe('TESTMKT');
  });
});

describe('MarketplaceMappingFactory', () => {
  it('isMarketplaceSupported returns false for unregistered marketplace', () => {
    const { factory } = makeFactory();
    expect(factory.isMarketplaceSupported('UNKNOWN')).toBe(false);
  });

  it('isMarketplaceSupported returns true after registration', () => {
    const { registry, factory } = makeFactory();
    registry.register(new TestAdapter());
    expect(factory.isMarketplaceSupported('TESTMKT')).toBe(true);
  });

  it('listSupportedMarketplaces returns all registered keys', () => {
    const { registry, factory } = makeFactory();
    registry.register(new TestAdapter());
    expect(factory.listSupportedMarketplaces()).toContain('TESTMKT');
  });

  it('createTransformation returns a transformation result', () => {
    const { factory } = makeFactory();
    const schema = makeSchema();
    const input = {
      listingId: 'lst1',
      workspaceId: 'ws1',
      catalogProductId: 'prod1',
      title: 'Sony TV',
      brand: 'Sony',
    };
    const result = factory.createTransformation(input, schema, [], [], {});
    expect(result.listingId).toBe('lst1');
    expect(result.payload).toBeDefined();
  });

  it('createPreview marks result as dryRun', () => {
    const { factory } = makeFactory();
    const schema = makeSchema();
    const input = {
      listingId: 'lst1',
      workspaceId: 'ws1',
      catalogProductId: 'prod1',
      title: 'Test',
    };
    const result = factory.createPreview(input, schema, [], []);
    expect(result.isDryRun).toBe(true);
  });

  it('validate returns a validation result', () => {
    const { factory } = makeFactory();
    const schema = makeSchema();
    const result = factory.validate({ title: 'Sony TV' }, schema);
    expect(result.readinessScore).toBeGreaterThanOrEqual(0);
    expect(result.readinessScore).toBeLessThanOrEqual(100);
  });
});
