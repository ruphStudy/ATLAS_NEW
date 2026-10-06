import { Injectable } from '@nestjs/common';
import {
  ICategoryMapping,
  CategoryMappingStatus,
  ResolvedCategoryMapping,
} from '../interfaces';

@Injectable()
export class CategoryMappingEngine {
  /**
   * Resolve the best category mapping for a universal category.
   * Workspace-specific mappings take precedence over global mappings.
   * Manual overrides take precedence over auto-mapped.
   */
  resolve(
    universalCategory: string,
    marketplaceKey: string,
    country: string,
    availableMappings: ICategoryMapping[],
    workspaceId?: string,
  ): ResolvedCategoryMapping {
    const normalized = universalCategory.toLowerCase().trim();
    const mktKey = marketplaceKey.toUpperCase();

    const filtered = availableMappings.filter(
      (m) =>
        m.universalCategory.toLowerCase().trim() === normalized &&
        m.marketplaceKey.toUpperCase() === mktKey &&
        (m.country === country || m.country === 'GLOBAL') &&
        m.status !== CategoryMappingStatus.INVALID,
    );

    // Priority: workspace + manual > workspace + auto > global + manual > global + auto
    const scored = filtered.map((m) => ({
      mapping: m,
      score:
        (m.workspaceId === workspaceId ? 200 : 0) +
        (m.isManualOverride ? 100 : 0) +
        (m.country === country ? 50 : 0) +
        m.confidence,
    }));
    scored.sort((a, b) => b.score - a.score);

    if (scored.length === 0) {
      return {
        marketplaceCategory: '',
        confidence: 0,
        status: CategoryMappingStatus.UNMAPPED,
        source: 'missing',
      };
    }

    const best = scored[0]!.mapping;
    return {
      marketplaceCategory: best.marketplaceCategory,
      marketplaceCategoryId: best.marketplaceCategoryId ?? undefined,
      categoryPath: best.categoryPath ?? undefined,
      confidence: best.confidence,
      status: best.status,
      source: best.workspaceId === workspaceId ? 'workspace' : 'global',
    };
  }

  /**
   * Detect whether a category mapping is missing or invalid.
   */
  detectMissing(
    universalCategory: string,
    marketplaceKey: string,
    country: string,
    availableMappings: ICategoryMapping[],
  ): boolean {
    const resolved = this.resolve(universalCategory, marketplaceKey, country, availableMappings);
    return resolved.status === CategoryMappingStatus.UNMAPPED;
  }

  /**
   * Validate a category mapping record.
   */
  validate(mapping: Partial<ICategoryMapping>): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!mapping.universalCategory?.trim()) {
      errors.push('universalCategory is required');
    }
    if (!mapping.marketplaceKey?.trim()) {
      errors.push('marketplaceKey is required');
    }
    if (!mapping.marketplaceCategory?.trim()) {
      errors.push('marketplaceCategory is required');
    }
    if (
      mapping.confidence !== undefined &&
      (mapping.confidence < 0 || mapping.confidence > 100)
    ) {
      errors.push('confidence must be between 0 and 100');
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all unmapped categories from a set of universal categories.
   */
  detectUnmappedCategories(
    universalCategories: string[],
    marketplaceKey: string,
    country: string,
    availableMappings: ICategoryMapping[],
  ): string[] {
    return universalCategories.filter((cat) =>
      this.detectMissing(cat, marketplaceKey, country, availableMappings),
    );
  }
}
