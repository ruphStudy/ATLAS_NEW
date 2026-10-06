import { Injectable } from '@nestjs/common';
import {
  ApprovalCheckArea,
  ApprovalCheckResult,
  ApprovalRule,
  ApprovalValidationSummary,
} from '../interfaces';
import { LISTING_APPROVAL_CONSTANTS } from '../constants';

export interface ListingContentSnapshot {
  title?: string | null;
  brand?: string | null;
  category?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  images?: unknown[];
  variants?: unknown[];
  attributes?: Record<string, string>;
  specifications?: Record<string, string>;
  searchTerms?: string[];
  pricing?: { sellingPrice?: number | null } | null;
}

@Injectable()
export class ApprovalValidationEngine {
  /**
   * Runs all approval checks against listing content.
   * Returns a full ApprovalValidationSummary.
   */
  validate(
    content: ListingContentSnapshot,
    rules: ApprovalRule[],
    overrideResults?: ApprovalCheckResult[],
  ): ApprovalValidationSummary {
    const overrideMap = new Map<ApprovalCheckArea, ApprovalCheckResult>(
      (overrideResults ?? []).map((r) => [r.area, r]),
    );

    const checkResults: ApprovalCheckResult[] = rules.map((rule) => {
      if (overrideMap.has(rule.area)) {
        return overrideMap.get(rule.area)!;
      }
      return this.runCheck(rule.area, content);
    });

    const passedAreas = checkResults.filter((r) => r.passed).map((r) => r.area);
    const failedAreas = checkResults.filter((r) => !r.passed).map((r) => r.area);

    // Only required-area failures block approval
    const requiredAreas = new Set(rules.filter((r) => r.required).map((r) => r.area));
    const requiredFailures = failedAreas.filter((a) => requiredAreas.has(a));
    const allPassed = requiredFailures.length === 0;

    return { allPassed, passedAreas, failedAreas, checkResults };
  }

  private runCheck(area: ApprovalCheckArea, content: ListingContentSnapshot): ApprovalCheckResult {
    let passed = false;
    let notes: string | null = null;

    switch (area) {
      case ApprovalCheckArea.PRODUCT_INFORMATION:
        passed = !!(content.title && content.title.trim().length > 0);
        if (!passed) notes = 'Product title is missing';
        break;

      case ApprovalCheckArea.IMAGES:
        passed = Array.isArray(content.images) && content.images.length > 0;
        if (!passed) notes = 'At least one image is required';
        break;

      case ApprovalCheckArea.AI_DESCRIPTION:
        passed = !!(content.description && content.description.trim().length > 0);
        if (!passed) notes = 'Product description is missing';
        break;

      case ApprovalCheckArea.SEO:
        passed = Array.isArray(content.searchTerms) && content.searchTerms.length > 0;
        if (!passed) notes = 'Search terms are not set';
        break;

      case ApprovalCheckArea.PRICING:
        passed = !!(content.pricing?.sellingPrice && content.pricing.sellingPrice > 0);
        if (!passed) notes = 'Selling price is not set or is zero';
        break;

      case ApprovalCheckArea.CATEGORY:
        passed = !!(content.category && content.category.trim().length > 0);
        if (!passed) notes = 'Category is not assigned';
        break;

      case ApprovalCheckArea.ATTRIBUTES:
        passed =
          !!content.attributes && Object.keys(content.attributes).length > 0;
        if (!passed) notes = 'No product attributes defined';
        break;

      case ApprovalCheckArea.VARIANTS:
        // Variants are optional; pass by default unless explicitly overridden
        passed = true;
        break;

      case ApprovalCheckArea.MARKETPLACE_REQUIREMENTS:
        // Basic check: title + description + pricing present
        passed =
          !!(content.title?.trim()) &&
          !!(content.description?.trim()) &&
          !!(content.pricing?.sellingPrice && content.pricing.sellingPrice > 0);
        if (!passed) notes = 'One or more mandatory marketplace fields are missing';
        break;

      default:
        passed = true;
    }

    return { area, passed, notes };
  }

  defaultRules(): ApprovalRule[] {
    return LISTING_APPROVAL_CONSTANTS.DEFAULT_APPROVAL_RULES as ApprovalRule[];
  }
}
