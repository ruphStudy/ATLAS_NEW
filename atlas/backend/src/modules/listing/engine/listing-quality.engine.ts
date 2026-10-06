import { Injectable } from '@nestjs/common';
import {
  ListingContent,
  ListingValidationResult,
  MissingAttribute,
} from '../interfaces';
import { LISTING_CONSTANTS } from '../constants';

/**
 * ListingQualityEngine
 *
 * Validates and scores UNIVERSAL listings (marketplace-agnostic).
 * Marketplace-specific validation is performed by the
 * Marketplace Listing Mapping Foundation (ValidationRuleEngine).
 */
@Injectable()
export class ListingQualityEngine {
  /**
   * Validates universal listing completeness and computes quality score (0–100).
   */
  validate(content: ListingContent): ListingValidationResult {
    const required = LISTING_CONSTANTS.UNIVERSAL_REQUIRED_FIELDS;
    const recommended = LISTING_CONSTANTS.UNIVERSAL_RECOMMENDED_FIELDS;
    const weights = LISTING_CONSTANTS.QUALITY_WEIGHTS;

    const missingAttributes: MissingAttribute[] = [];
    const warnings: string[] = [];
    let earnedScore = 0;
    let maxScore = 0;

    for (const [key, weight] of Object.entries(weights)) {
      const field = this.keyToField(key);
      const present = this.isPresent(content, field);
      maxScore += weight;
      if (present) {
        earnedScore += weight;
      } else if (required.includes(field)) {
        missingAttributes.push({ field, label: this.fieldLabel(field), severity: 'REQUIRED' });
      } else if (recommended.includes(field)) {
        missingAttributes.push({ field, label: this.fieldLabel(field), severity: 'RECOMMENDED' });
      }
    }

    const qualityScore = maxScore > 0 ? Math.round((earnedScore / maxScore) * 100) : 0;

    // Universal warnings
    if (content.title && content.title.length > LISTING_CONSTANTS.DEFAULT_TITLE_LIMIT) {
      warnings.push('Title exceeds universal character limit');
    }
    if (content.images && content.images.length === 0) {
      warnings.push('No images attached');
    }
    if (content.bulletPoints && content.bulletPoints.length > 10) {
      warnings.push('More than 10 bullet points — marketplace limits may be lower');
    }
    if (!content.seo) {
      warnings.push('SEO metadata missing — recommended for marketplace transformation');
    }

    const isComplete = missingAttributes.filter((m) => m.severity === 'REQUIRED').length === 0;
    return { isComplete, qualityScore, missingAttributes, warnings };
  }

  private keyToField(key: string): string {
    const map: Record<string, string> = {
      TITLE: 'title',
      BRAND: 'brand',
      CATEGORY: 'category',
      DESCRIPTION: 'description',
      BULLET_POINTS: 'bulletPoints',
      IMAGES: 'images',
      PRICING: 'pricing',
      SEARCH_TERMS: 'searchTerms',
      SEO: 'seo',
      VARIANTS: 'variants',
      ATTRIBUTES: 'attributes',
      SPECIFICATIONS: 'specifications',
    };
    return map[key] ?? key.toLowerCase();
  }

  private fieldLabel(field: string): string {
    return field.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase()).trim();
  }

  private isPresent(content: ListingContent, field: string): boolean {
    const value = (content as Record<string, unknown>)[field];
    if (value === null || value === undefined || value === '') return false;
    if (Array.isArray(value)) return value.length > 0;
    if (typeof value === 'object') return Object.keys(value as object).length > 0;
    return true;
  }
}
