import { Injectable } from '@nestjs/common';
import {
  IAttributeMapping,
  AttributeTransformType,
  FieldCondition,
  IUnitConversion,
  ResolvedAttributeValue,
  MappingStatus,
  TransformationIssue,
  ValidationSeverity,
} from '../interfaces';
import { MAPPING_ERROR_CODES } from '../constants';

@Injectable()
export class AttributeMappingEngine {
  /**
   * Resolve all attributes for a given marketplace from universal attributes.
   */
  resolveAttributes(
    universalAttrs: Record<string, unknown>,
    attributeMappings: IAttributeMapping[],
    workspaceId?: string,
  ): {
    resolved: ResolvedAttributeValue[];
    unsupported: string[];
    warnings: TransformationIssue[];
  } {
    const resolved: ResolvedAttributeValue[] = [];
    const unsupported: string[] = [];
    const warnings: TransformationIssue[] = [];
    const processedUniversal = new Set<string>();

    // Published mappings only, workspace overrides first
    const activeMappings = attributeMappings
      .filter((m) => m.status === MappingStatus.PUBLISHED)
      .sort((a, b) => {
        const aWs = a.workspaceId === workspaceId ? 1 : 0;
        const bWs = b.workspaceId === workspaceId ? 1 : 0;
        return bWs - aWs;
      });

    const mappingsByUniversal = new Map<string, IAttributeMapping>();
    for (const m of activeMappings) {
      if (!mappingsByUniversal.has(m.universalAttribute)) {
        mappingsByUniversal.set(m.universalAttribute, m);
      }
    }

    for (const [uAttr, uValue] of Object.entries(universalAttrs)) {
      const mapping = mappingsByUniversal.get(uAttr);
      if (!mapping) {
        unsupported.push(uAttr);
        continue;
      }

      // Evaluate conditions
      if (mapping.conditions?.length) {
        const condMet = this.evaluateConditions(mapping.conditions, universalAttrs);
        if (!condMet) {
          warnings.push({
            field: uAttr,
            code: MAPPING_ERROR_CODES.CONDITIONAL_NOT_MET,
            message: `Attribute ${uAttr} skipped: conditions not met`,
            severity: ValidationSeverity.INFO,
          });
          processedUniversal.add(uAttr);
          continue;
        }
      }

      try {
        const transformedValue = this.applyTransform(mapping, uValue, universalAttrs);
        resolved.push({
          marketplaceAttribute: mapping.marketplaceAttribute,
          value: transformedValue,
          transformType: mapping.transformType,
          sourceAttribute: uAttr,
          originalValue: uValue,
          usedDefault: false,
        });
      } catch (err) {
        warnings.push({
          field: uAttr,
          code: MAPPING_ERROR_CODES.ENUM_MAPPING_FAILED,
          message: `Attribute ${uAttr} transform failed: ${err instanceof Error ? err.message : 'unknown'}`,
          severity: ValidationSeverity.WARNING,
        });
        if (mapping.defaultValue !== undefined && mapping.defaultValue !== null) {
          resolved.push({
            marketplaceAttribute: mapping.marketplaceAttribute,
            value: mapping.defaultValue,
            transformType: AttributeTransformType.DEFAULT_VALUE,
            sourceAttribute: uAttr,
            originalValue: uValue,
            usedDefault: true,
          });
        }
      }

      processedUniversal.add(uAttr);
    }

    // Inject default values for required mapped attributes whose source was absent
    for (const mapping of activeMappings) {
      if (
        !processedUniversal.has(mapping.universalAttribute) &&
        !(mapping.universalAttribute in universalAttrs) &&
        mapping.isRequired &&
        mapping.defaultValue !== undefined &&
        mapping.defaultValue !== null
      ) {
        resolved.push({
          marketplaceAttribute: mapping.marketplaceAttribute,
          value: mapping.defaultValue,
          transformType: AttributeTransformType.DEFAULT_VALUE,
          sourceAttribute: mapping.universalAttribute,
          originalValue: undefined,
          usedDefault: true,
        });
      }
    }

    return { resolved, unsupported, warnings };
  }

  /**
   * Apply a single attribute transform.
   */
  applyTransform(
    mapping: IAttributeMapping,
    value: unknown,
    context: Record<string, unknown> = {},
  ): unknown {
    switch (mapping.transformType) {
      case AttributeTransformType.DIRECT:
      case AttributeTransformType.RENAME:
        return value;

      case AttributeTransformType.VALUE_TRANSFORM:
        return this.applyValueTransform(mapping.valueMapping ?? {}, value);

      case AttributeTransformType.ENUM_MAP:
        return this.applyEnumMap(mapping.valueMapping ?? {}, value);

      case AttributeTransformType.UNIT_CONVERT:
        return this.applyUnitConvert(mapping.unitConversion!, value);

      case AttributeTransformType.DEFAULT_VALUE:
        return value ?? mapping.defaultValue;

      case AttributeTransformType.CONDITIONAL:
        return this.applyConditional(mapping, value, context);

      case AttributeTransformType.DERIVED:
        return this.applyDerived(mapping.derivedExpression ?? '', context);

      case AttributeTransformType.REQUIRED_FALLBACK:
        return value ?? mapping.defaultValue;

      default:
        return value;
    }
  }

  private applyValueTransform(
    valueMapping: Record<string, unknown>,
    value: unknown,
  ): unknown {
    const key = String(value);
    return key in valueMapping ? valueMapping[key] : value;
  }

  private applyEnumMap(valueMapping: Record<string, unknown>, value: unknown): unknown {
    const key = String(value).toLowerCase();
    const directKey = String(value);

    if (directKey in valueMapping) return valueMapping[directKey];
    if (key in valueMapping) return valueMapping[key];

    throw new Error(`No enum mapping found for value: ${String(value)}`);
  }

  private applyUnitConvert(conv: IUnitConversion, value: unknown): number {
    const numeric = parseFloat(String(value));
    if (isNaN(numeric)) throw new Error(`Cannot convert non-numeric value: ${String(value)}`);
    return numeric * conv.factor + (conv.offset ?? 0);
  }

  private applyConditional(
    mapping: IAttributeMapping,
    value: unknown,
    context: Record<string, unknown>,
  ): unknown {
    if (!mapping.conditions?.length) return value;
    const condMet = this.evaluateConditions(mapping.conditions, context);
    return condMet ? value : (mapping.defaultValue ?? null);
  }

  private applyDerived(expression: string, context: Record<string, unknown>): unknown {
    // Simple key lookup expression: "{key1} {key2}", etc.
    return expression.replace(/\{(\w+)\}/g, (_, key: string) => String(context[key] ?? ''));
  }

  evaluateConditions(
    conditions: FieldCondition[],
    context: Record<string, unknown>,
  ): boolean {
    return conditions.every((cond) => {
      const ctxValue = context[cond.field];
      switch (cond.operator) {
        case 'eq':
          return ctxValue === cond.value;
        case 'neq':
          return ctxValue !== cond.value;
        case 'in':
          return Array.isArray(cond.value) && (cond.value as unknown[]).includes(ctxValue);
        case 'nin':
          return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(ctxValue);
        case 'exists':
          return ctxValue !== undefined && ctxValue !== null;
        case 'not_exists':
          return ctxValue === undefined || ctxValue === null;
        default:
          return true;
      }
    });
  }

  /**
   * Detect unsupported attributes (no mapping defined).
   */
  detectUnsupported(
    universalAttrs: Record<string, unknown>,
    attributeMappings: IAttributeMapping[],
  ): string[] {
    const mappedKeys = new Set(attributeMappings.map((m) => m.universalAttribute));
    return Object.keys(universalAttrs).filter((k) => !mappedKeys.has(k));
  }
}
