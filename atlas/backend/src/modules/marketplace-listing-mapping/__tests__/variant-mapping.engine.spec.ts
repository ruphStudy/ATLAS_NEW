import { VariantMappingEngine } from '../engines/variant-mapping.engine';
import {
  IUniversalVariant,
  MarketplaceVariantRules,
  VariantStructureType,
} from '../interfaces';

function makeVariant(overrides: Partial<IUniversalVariant> = {}): IUniversalVariant {
  return {
    id: 'v1',
    sku: 'SKU-RED-L',
    name: 'Red Large',
    attributes: { color: 'Red', size: 'L' },
    price: 29.99,
    compareAtPrice: 39.99,
    imageIds: ['img1'],
    stockQty: 50,
    ...overrides,
  };
}

const DEFAULT_RULES: MarketplaceVariantRules = {
  supported: true,
  structure: VariantStructureType.PARENT_CHILD,
  maxVariants: 10,
  allowedThemes: ['SIZE', 'COLOR'],
  requiresParentSku: true,
  maxAttributesPerVariant: 5,
};

describe('VariantMappingEngine', () => {
  let engine: VariantMappingEngine;

  beforeEach(() => {
    engine = new VariantMappingEngine();
  });

  describe('mapVariants()', () => {
    it('maps variants to marketplace structure', () => {
      const variants = [
        makeVariant({ sku: 'SKU-RED-L', attributes: { color: 'Red', size: 'L' } }),
        makeVariant({ id: 'v2', sku: 'SKU-BLUE-M', attributes: { color: 'Blue', size: 'M' } }),
      ];
      const result = engine.mapVariants(variants, DEFAULT_RULES, 'PARENT-SKU');
      expect(result.variants).toHaveLength(2);
      expect(result.variants[0]!.childSku).toBe('SKU-RED-L');
      expect(result.variants[0]!.parentSku).toBe('PARENT-SKU');
      expect(result.structure).toBe(VariantStructureType.PARENT_CHILD);
    });

    it('assigns sequential position to variants', () => {
      const variants = [makeVariant(), makeVariant({ id: 'v2', sku: 'SKU-2' })];
      const result = engine.mapVariants(variants, DEFAULT_RULES);
      expect(result.variants[0]!.position).toBe(1);
      expect(result.variants[1]!.position).toBe(2);
    });

    it('returns empty variants when structure not supported', () => {
      const rules = { ...DEFAULT_RULES, supported: false };
      const result = engine.mapVariants([makeVariant()], rules);
      expect(result.variants).toHaveLength(0);
    });

    it('truncates variants exceeding max count and adds warning', () => {
      const rules = { ...DEFAULT_RULES, maxVariants: 2 };
      const variants = Array.from({ length: 5 }, (_, i) =>
        makeVariant({ id: `v${i}`, sku: `SKU-${i}` }),
      );
      const result = engine.mapVariants(variants, rules);
      expect(result.variants).toHaveLength(2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]!.message).toContain('Truncating');
    });

    it('adds warning when per-variant attribute count exceeded', () => {
      const rules = { ...DEFAULT_RULES, maxAttributesPerVariant: 1 };
      const v = makeVariant({ attributes: { color: 'Red', size: 'L', material: 'Cotton' } });
      const result = engine.mapVariants([v], rules);
      expect(result.warnings.some((w) => w.message.includes('attributes'))).toBe(true);
    });

    it('creates parentRecord when requiresParentSku is true', () => {
      const result = engine.mapVariants([makeVariant()], DEFAULT_RULES, 'MY-PARENT');
      expect(result.parentRecord).toBeDefined();
      expect((result.parentRecord as Record<string, unknown>)['sku']).toBe('MY-PARENT');
    });

    it('does not create parentRecord for STANDALONE structure', () => {
      const rules = { ...DEFAULT_RULES, structure: VariantStructureType.STANDALONE, requiresParentSku: false };
      const result = engine.mapVariants([makeVariant()], rules);
      expect(result.parentRecord).toBeNull();
    });
  });

  describe('detectVariationTheme()', () => {
    it('detects SIZE theme', () => {
      const theme = engine.detectVariationTheme({ SIZE: 'L' }, ['SIZE', 'COLOR']);
      expect(theme).toBe('SIZE');
    });

    it('detects COLOR theme', () => {
      const theme = engine.detectVariationTheme({ COLOR: 'Red' }, ['SIZE', 'COLOR']);
      expect(theme).toBe('COLOR');
    });

    it('returns first allowed theme when no keyword matches', () => {
      const theme = engine.detectVariationTheme({ material: 'Cotton' }, ['SIZE', 'COLOR']);
      expect(theme).toBe('SIZE');
    });

    it('returns null when allowedThemes is empty and no keyword matches', () => {
      const theme = engine.detectVariationTheme({ material: 'Cotton' }, []);
      expect(theme).toBeNull();
    });
  });

  describe('validateVariantCombinations()', () => {
    it('returns no issues for consistent valid themes', () => {
      const variants = [
        { ...makeVariant(), variationTheme: 'COLOR', parentSku: null, position: 1 },
        { ...makeVariant({ id: 'v2', sku: 'SKU-2' }), variationTheme: 'COLOR', parentSku: null, position: 2 },
      ];
      const issues = engine.validateVariantCombinations(variants, ['SIZE', 'COLOR']);
      expect(issues).toHaveLength(0);
    });

    it('warns on disallowed theme', () => {
      const variants = [
        { ...makeVariant(), variationTheme: 'MATERIAL', parentSku: null, position: 1 },
      ];
      const issues = engine.validateVariantCombinations(variants, ['SIZE', 'COLOR']);
      expect(issues.some((i) => i.message.includes('MATERIAL'))).toBe(true);
    });

    it('warns on inconsistent themes across variants', () => {
      const variants = [
        { ...makeVariant(), variationTheme: 'COLOR', parentSku: null, position: 1 },
        { ...makeVariant({ id: 'v2', sku: 'SKU-2' }), variationTheme: 'SIZE', parentSku: null, position: 2 },
      ];
      const issues = engine.validateVariantCombinations(variants, ['SIZE', 'COLOR']);
      expect(issues.some((i) => i.message.includes('inconsistent'))).toBe(true);
    });
  });
});
