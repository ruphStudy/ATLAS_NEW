import { AttributeMappingEngine } from '../engines/attribute-mapping.engine';
import {
  IAttributeMapping,
  AttributeTransformType,
  MappingStatus,
  FieldCondition,
} from '../interfaces';

function makeMapping(overrides: Partial<IAttributeMapping> = {}): IAttributeMapping {
  return {
    id: 'am1',
    workspaceId: 'ws1',
    schemaId: null,
    marketplaceKey: 'AMAZON',
    country: 'US',
    universalAttribute: 'color',
    marketplaceAttribute: 'color_name',
    transformType: AttributeTransformType.DIRECT,
    valueMapping: null,
    unitConversion: null,
    defaultValue: null,
    isRequired: false,
    isManualOverride: false,
    conditions: null,
    derivedExpression: null,
    version: 1,
    status: MappingStatus.PUBLISHED,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('AttributeMappingEngine', () => {
  let engine: AttributeMappingEngine;

  beforeEach(() => {
    engine = new AttributeMappingEngine();
  });

  // ── Direct / Rename ──────────────────────────────────────

  describe('DIRECT transform', () => {
    it('passes value through unchanged', () => {
      const result = engine.applyTransform(makeMapping(), 'Red');
      expect(result).toBe('Red');
    });
  });

  describe('RENAME transform', () => {
    it('passes value unchanged (only field name changes)', () => {
      const m = makeMapping({ transformType: AttributeTransformType.RENAME });
      expect(engine.applyTransform(m, 'Blue')).toBe('Blue');
    });
  });

  // ── Enum Mapping ─────────────────────────────────────────

  describe('ENUM_MAP transform', () => {
    it('maps known enum values', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.ENUM_MAP,
        valueMapping: { red: 'Red / Scarlet', blue: 'Blue / Navy' },
      });
      expect(engine.applyTransform(m, 'red')).toBe('Red / Scarlet');
    });

    it('is case-insensitive on lookup', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.ENUM_MAP,
        valueMapping: { red: 'Red' },
      });
      expect(engine.applyTransform(m, 'RED')).toBe('Red');
    });

    it('throws for unknown enum value', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.ENUM_MAP,
        valueMapping: { red: 'Red' },
      });
      expect(() => engine.applyTransform(m, 'green')).toThrow(/enum mapping/i);
    });
  });

  // ── Unit Conversion ───────────────────────────────────────

  describe('UNIT_CONVERT transform', () => {
    it('converts kg to lbs with factor', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.UNIT_CONVERT,
        unitConversion: { fromUnit: 'kg', toUnit: 'lbs', factor: 2.20462 },
      });
      const result = engine.applyTransform(m, '5') as number;
      expect(result).toBeCloseTo(11.023, 2);
    });

    it('applies offset', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.UNIT_CONVERT,
        unitConversion: { fromUnit: 'C', toUnit: 'F', factor: 1.8, offset: 32 },
      });
      expect(engine.applyTransform(m, '100')).toBeCloseTo(212);
    });

    it('throws for non-numeric value', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.UNIT_CONVERT,
        unitConversion: { fromUnit: 'kg', toUnit: 'lbs', factor: 2.20462 },
      });
      expect(() => engine.applyTransform(m, 'not-a-number')).toThrow();
    });
  });

  // ── Default Value ─────────────────────────────────────────

  describe('DEFAULT_VALUE transform', () => {
    it('returns value when present', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.DEFAULT_VALUE,
        defaultValue: 'DefaultColor',
      });
      expect(engine.applyTransform(m, 'Red')).toBe('Red');
    });

    it('returns default when value is null', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.DEFAULT_VALUE,
        defaultValue: 'DefaultColor',
      });
      expect(engine.applyTransform(m, null)).toBe('DefaultColor');
    });
  });

  // ── Derived ───────────────────────────────────────────────

  describe('DERIVED transform', () => {
    it('expands template placeholders from context', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.DERIVED,
        derivedExpression: '{brand} {model}',
      });
      const context = { brand: 'Sony', model: 'XR-55' };
      expect(engine.applyTransform(m, undefined, context)).toBe('Sony XR-55');
    });
  });

  // ── Conditional ───────────────────────────────────────────

  describe('evaluateConditions()', () => {
    it('returns true when all eq conditions pass', () => {
      const conds: FieldCondition[] = [{ field: 'type', operator: 'eq', value: 'TV' }];
      expect(engine.evaluateConditions(conds, { type: 'TV' })).toBe(true);
    });

    it('returns false when condition fails', () => {
      const conds: FieldCondition[] = [{ field: 'type', operator: 'eq', value: 'Phone' }];
      expect(engine.evaluateConditions(conds, { type: 'TV' })).toBe(false);
    });

    it('evaluates in operator', () => {
      const conds: FieldCondition[] = [{ field: 'color', operator: 'in', value: ['Red', 'Blue'] }];
      expect(engine.evaluateConditions(conds, { color: 'Red' })).toBe(true);
      expect(engine.evaluateConditions(conds, { color: 'Green' })).toBe(false);
    });

    it('evaluates exists operator', () => {
      const conds: FieldCondition[] = [{ field: 'brand', operator: 'exists' }];
      expect(engine.evaluateConditions(conds, { brand: 'Sony' })).toBe(true);
      expect(engine.evaluateConditions(conds, {})).toBe(false);
    });
  });

  // ── resolveAttributes() ───────────────────────────────────

  describe('resolveAttributes()', () => {
    it('maps multiple attributes and tracks unsupported ones', () => {
      const mappings = [
        makeMapping({ universalAttribute: 'color', marketplaceAttribute: 'color_name' }),
        makeMapping({ id: 'am2', universalAttribute: 'size', marketplaceAttribute: 'size_value' }),
      ];
      const attrs = { color: 'Red', size: 'L', weight: '500' };
      const { resolved, unsupported } = engine.resolveAttributes(attrs, mappings, 'ws1');
      expect(resolved.find((r) => r.marketplaceAttribute === 'color_name')!.value).toBe('Red');
      expect(resolved.find((r) => r.marketplaceAttribute === 'size_value')!.value).toBe('L');
      expect(unsupported).toContain('weight');
    });

    it('prefers workspace-specific mapping over global', () => {
      const global = makeMapping({ workspaceId: null, marketplaceAttribute: 'color_global' });
      const ws = makeMapping({ workspaceId: 'ws1', marketplaceAttribute: 'color_ws' });
      const { resolved } = engine.resolveAttributes({ color: 'Red' }, [global, ws], 'ws1');
      expect(resolved[0]!.marketplaceAttribute).toBe('color_ws');
    });

    it('injects default value when required attr is absent', () => {
      const m = makeMapping({
        universalAttribute: 'brand',
        marketplaceAttribute: 'brand_name',
        isRequired: true,
        defaultValue: 'Generic',
      });
      const { resolved } = engine.resolveAttributes({}, [m], 'ws1');
      const r = resolved.find((r) => r.marketplaceAttribute === 'brand_name');
      expect(r).toBeDefined();
      expect(r!.value).toBe('Generic');
      expect(r!.usedDefault).toBe(true);
    });

    it('skips DRAFT/DEPRECATED/ARCHIVED mappings', () => {
      const m = makeMapping({ status: 'DRAFT' as MappingStatus });
      const { resolved, unsupported } = engine.resolveAttributes({ color: 'Red' }, [m], 'ws1');
      expect(resolved).toHaveLength(0);
      expect(unsupported).toContain('color');
    });

    it('falls back to default when enum mapping fails', () => {
      const m = makeMapping({
        transformType: AttributeTransformType.ENUM_MAP,
        valueMapping: { red: 'Red' },
        defaultValue: 'Unknown',
      });
      const { resolved, warnings } = engine.resolveAttributes({ color: 'purple' }, [m], 'ws1');
      expect(resolved[0]!.usedDefault).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });
  });

  // ── detectUnsupported() ───────────────────────────────────

  describe('detectUnsupported()', () => {
    it('returns attributes not in any mapping', () => {
      const mappings = [makeMapping({ universalAttribute: 'color' })];
      const result = engine.detectUnsupported({ color: 'Red', brand: 'Sony', weight: '1kg' }, mappings);
      expect(result).toContain('brand');
      expect(result).toContain('weight');
      expect(result).not.toContain('color');
    });
  });
});
