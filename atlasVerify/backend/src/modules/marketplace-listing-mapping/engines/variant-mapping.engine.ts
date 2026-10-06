import { Injectable } from '@nestjs/common';
import {
  IUniversalVariant,
  MarketplaceVariantRules,
  VariantStructureType,
  VariantMappingResult,
  MappedVariant,
  TransformationIssue,
  ValidationSeverity,
} from '../interfaces';
import { MAPPING_ERROR_CODES } from '../constants';

@Injectable()
export class VariantMappingEngine {
  /**
   * Map universal variants into a marketplace-specific structure.
   */
  mapVariants(
    universalVariants: IUniversalVariant[],
    rules: MarketplaceVariantRules,
    parentSku?: string | null,
  ): VariantMappingResult {
    const warnings: TransformationIssue[] = [];

    if (!rules.supported || universalVariants.length === 0) {
      return { structure: rules.structure, variants: [], warnings };
    }

    // Enforce max variant count
    let variants = universalVariants;
    if (variants.length > rules.maxVariants) {
      warnings.push({
        field: 'variants',
        code: MAPPING_ERROR_CODES.VARIANT_INVALID,
        message: `Variant count (${variants.length}) exceeds marketplace maximum (${rules.maxVariants}). Truncating.`,
        severity: ValidationSeverity.WARNING,
      });
      variants = variants.slice(0, rules.maxVariants);
    }

    const mapped: MappedVariant[] = variants.map((v, idx) => {
      const attrKeys = Object.keys(v.attributes);

      // Warn if attributes exceed per-variant maximum
      if (attrKeys.length > rules.maxAttributesPerVariant) {
        warnings.push({
          field: `variants[${idx}].attributes`,
          code: MAPPING_ERROR_CODES.VARIANT_INVALID,
          message: `Variant ${v.sku} has ${attrKeys.length} attributes, max is ${rules.maxAttributesPerVariant}`,
          severity: ValidationSeverity.WARNING,
        });
      }

      const detectedTheme = this.detectVariationTheme(v.attributes, rules.allowedThemes);

      return {
        parentSku: rules.structure === VariantStructureType.PARENT_CHILD
          ? (parentSku ?? null)
          : null,
        childSku: v.sku,
        name: v.name,
        variationTheme: detectedTheme,
        attributes: v.attributes,
        price: v.price ?? null,
        compareAtPrice: v.compareAtPrice ?? null,
        imageUrls: v.imageIds ?? [],
        stockQty: v.stockQty ?? null,
        position: idx + 1,
      };
    });

    // Validate variation theme consistency
    const invalidThemeWarnings = this.validateVariantCombinations(mapped, rules.allowedThemes);
    warnings.push(...invalidThemeWarnings);

    const parentRecord =
      rules.structure === VariantStructureType.PARENT_CHILD && rules.requiresParentSku
        ? {
            sku: parentSku,
            variationTheme: this.getConsistentTheme(mapped),
            childAsins: mapped.map((v) => v.childSku),
          }
        : null;

    return {
      structure: rules.structure,
      parentRecord,
      variants: mapped,
      warnings,
    };
  }

  /**
   * Validate variant combinations against allowed themes.
   */
  validateVariantCombinations(
    variants: MappedVariant[],
    allowedThemes: string[],
  ): TransformationIssue[] {
    const issues: TransformationIssue[] = [];

    if (allowedThemes.length === 0) return issues;

    const themes = variants.map((v) => v.variationTheme).filter(Boolean);
    const uniqueThemes = new Set(themes);

    for (const theme of uniqueThemes) {
      if (theme && !allowedThemes.includes(theme)) {
        issues.push({
          field: 'variants',
          code: MAPPING_ERROR_CODES.VARIANT_INVALID,
          message: `Variation theme "${theme}" is not allowed. Allowed: ${allowedThemes.join(', ')}`,
          severity: ValidationSeverity.WARNING,
        });
      }
    }

    // All variants must use same theme in parent-child structure
    if (uniqueThemes.size > 1) {
      issues.push({
        field: 'variants',
        code: MAPPING_ERROR_CODES.VARIANT_INVALID,
        message: `Variants use inconsistent variation themes: ${[...uniqueThemes].join(', ')}`,
        severity: ValidationSeverity.WARNING,
      });
    }

    return issues;
  }

  /**
   * Detect the variation theme for a variant based on its attribute keys.
   */
  detectVariationTheme(
    attributes: Record<string, string>,
    allowedThemes: string[],
  ): string | null {
    const attrKeys = Object.keys(attributes).map((k) => k.toUpperCase());

    const themeKeywords: Record<string, string[]> = {
      SIZE: ['SIZE', 'SIZE_NAME'],
      COLOR: ['COLOR', 'COLOUR', 'COLOR_NAME'],
      STYLE: ['STYLE', 'STYLE_NAME'],
      PACK: ['PACK', 'PACK_SIZE', 'COUNT'],
    };

    for (const [theme, keywords] of Object.entries(themeKeywords)) {
      if (attrKeys.some((k) => keywords.includes(k))) {
        if (allowedThemes.length === 0 || allowedThemes.includes(theme)) {
          return theme;
        }
      }
    }

    return allowedThemes[0] ?? null;
  }

  private getConsistentTheme(variants: MappedVariant[]): string | null {
    const themes = [...new Set(variants.map((v) => v.variationTheme).filter(Boolean))];
    return themes.length === 1 ? (themes[0] ?? null) : null;
  }
}
