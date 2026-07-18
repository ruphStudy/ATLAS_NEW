import { Injectable } from '@nestjs/common';
import {
  MarketplaceContentRules,
  TransformationIssue,
  ValidationSeverity,
} from '../interfaces';
import { MAPPING_ERROR_CODES } from '../constants';

export interface ContentInput {
  title?: string | null;
  description?: string | null;
  bulletPoints?: string[];
  searchTerms?: string[];
  brand?: string | null;
}

export interface ContentRuleResult {
  title: string | null;
  description: string | null;
  bulletPoints: string[];
  searchTerms: string[];
  warnings: TransformationIssue[];
  errors: TransformationIssue[];
}

@Injectable()
export class ContentRuleEngine {
  /**
   * Apply content rules to content, enforcing limits and format requirements.
   * Does not reject – returns warnings/errors with applied truncations.
   */
  applyRules(content: ContentInput, rules: MarketplaceContentRules): ContentRuleResult {
    const warnings: TransformationIssue[] = [];
    const errors: TransformationIssue[] = [];

    const title = this.processTitle(content.title ?? null, content.brand ?? null, rules, warnings);
    const description = this.processDescription(content.description ?? null, rules, warnings);
    const bulletPoints = this.processBulletPoints(content.bulletPoints ?? [], rules, warnings);
    const searchTerms = this.processSearchTerms(content.searchTerms ?? [], rules, warnings);

    // Validate restricted words
    const allText = [title, description, ...bulletPoints].filter(Boolean).join(' ');
    this.detectRestrictedWords(allText, rules, errors);
    this.detectProhibitedClaims(allText, rules, errors);

    return { title, description, bulletPoints, searchTerms, warnings, errors };
  }

  private processTitle(
    title: string | null,
    brand: string | null,
    rules: MarketplaceContentRules,
    warnings: TransformationIssue[],
  ): string | null {
    if (!title) return null;

    let processed = title;

    // Prepend brand if required
    if (rules.brandInTitle && brand && !processed.toLowerCase().includes(brand.toLowerCase())) {
      processed = `${brand} ${processed}`;
    }

    // Apply capitalization rules
    if (!rules.allowCapitalization) {
      const words = processed.split(' ');
      processed = words
        .map((w) => (w.length > 0 ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w))
        .join(' ');
    }

    // Remove special characters if not allowed
    if (!rules.allowSpecialChars) {
      processed = processed.replace(/[^\w\s\-.,]/g, '');
    }

    // Truncate
    if (processed.length > rules.maxTitleLength) {
      warnings.push({
        field: 'title',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Title truncated from ${processed.length} to ${rules.maxTitleLength} characters`,
        severity: ValidationSeverity.WARNING,
      });
      processed = processed.slice(0, rules.maxTitleLength).trim();
    }

    return processed;
  }

  private processDescription(
    description: string | null,
    rules: MarketplaceContentRules,
    warnings: TransformationIssue[],
  ): string | null {
    if (!description) return null;

    let processed = description;

    // Strip HTML if not allowed
    if (!rules.htmlInDescription) {
      processed = this.stripHtml(processed);
    }

    if (processed.length > rules.maxDescriptionLength) {
      warnings.push({
        field: 'description',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Description truncated from ${processed.length} to ${rules.maxDescriptionLength} characters`,
        severity: ValidationSeverity.WARNING,
      });
      processed = processed.slice(0, rules.maxDescriptionLength).trim();
    }

    return processed;
  }

  private processBulletPoints(
    bullets: string[],
    rules: MarketplaceContentRules,
    warnings: TransformationIssue[],
  ): string[] {
    let processed = bullets;

    if (processed.length > rules.maxBulletPoints) {
      warnings.push({
        field: 'bulletPoints',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Bullet points truncated from ${processed.length} to ${rules.maxBulletPoints}`,
        severity: ValidationSeverity.WARNING,
      });
      processed = processed.slice(0, rules.maxBulletPoints);
    }

    return processed.map((bullet, idx) => {
      if (bullet.length > rules.maxBulletLength) {
        warnings.push({
          field: `bulletPoints[${idx}]`,
          code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
          message: `Bullet ${idx + 1} truncated from ${bullet.length} to ${rules.maxBulletLength} characters`,
          severity: ValidationSeverity.WARNING,
        });
        return bullet.slice(0, rules.maxBulletLength).trim();
      }
      return bullet;
    });
  }

  private processSearchTerms(
    terms: string[],
    rules: MarketplaceContentRules,
    warnings: TransformationIssue[],
  ): string[] {
    let processed = terms;

    if (processed.length > rules.maxSearchTerms) {
      warnings.push({
        field: 'searchTerms',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Search terms truncated from ${processed.length} to ${rules.maxSearchTerms}`,
        severity: ValidationSeverity.WARNING,
      });
      processed = processed.slice(0, rules.maxSearchTerms);
    }

    return processed.map((term, idx) => {
      if (term.length > rules.maxSearchTermLength) {
        warnings.push({
          field: `searchTerms[${idx}]`,
          code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
          message: `Search term ${idx + 1} truncated to ${rules.maxSearchTermLength} characters`,
          severity: ValidationSeverity.WARNING,
        });
        return term.slice(0, rules.maxSearchTermLength).trim();
      }
      return term;
    });
  }

  private detectRestrictedWords(
    text: string,
    rules: MarketplaceContentRules,
    errors: TransformationIssue[],
  ): void {
    if (!rules.restrictedWords?.length) return;
    const lower = text.toLowerCase();
    for (const word of rules.restrictedWords) {
      if (lower.includes(word.toLowerCase())) {
        errors.push({
          field: 'content',
          code: MAPPING_ERROR_CODES.CONTENT_RULE_VIOLATION,
          message: `Content contains restricted word: "${word}"`,
          severity: ValidationSeverity.ERROR,
        });
      }
    }
  }

  private detectProhibitedClaims(
    text: string,
    rules: MarketplaceContentRules,
    errors: TransformationIssue[],
  ): void {
    if (!rules.prohibitedClaims?.length) return;
    const lower = text.toLowerCase();
    for (const claim of rules.prohibitedClaims) {
      if (lower.includes(claim.toLowerCase())) {
        errors.push({
          field: 'content',
          code: MAPPING_ERROR_CODES.CONTENT_RULE_VIOLATION,
          message: `Content contains prohibited claim: "${claim}"`,
          severity: ValidationSeverity.ERROR,
        });
      }
    }
  }

  /**
   * Validate content without applying transforms – for preview/validation flow.
   */
  validateContent(content: ContentInput, rules: MarketplaceContentRules): TransformationIssue[] {
    const issues: TransformationIssue[] = [];

    if (content.title && content.title.length > rules.maxTitleLength) {
      issues.push({
        field: 'title',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Title exceeds max length ${rules.maxTitleLength}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    if (content.description && content.description.length > rules.maxDescriptionLength) {
      issues.push({
        field: 'description',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Description exceeds max length ${rules.maxDescriptionLength}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    if (content.bulletPoints && content.bulletPoints.length > rules.maxBulletPoints) {
      issues.push({
        field: 'bulletPoints',
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Too many bullet points: max ${rules.maxBulletPoints}`,
        severity: ValidationSeverity.WARNING,
      });
    }

    if (!rules.allowPromotionalText && content.description) {
      const promoPatterns = /\b(sale|discount|% off|limited time|buy now|free shipping)\b/i;
      if (promoPatterns.test(content.description)) {
        issues.push({
          field: 'description',
          code: MAPPING_ERROR_CODES.CONTENT_RULE_VIOLATION,
          message: 'Description contains promotional text which is not allowed',
          severity: ValidationSeverity.WARNING,
        });
      }
    }

    const allText = [content.title, content.description, ...(content.bulletPoints ?? [])]
      .filter(Boolean)
      .join(' ');

    this.detectRestrictedWords(allText, rules, issues);
    this.detectProhibitedClaims(allText, rules, issues);

    return issues;
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }
}
