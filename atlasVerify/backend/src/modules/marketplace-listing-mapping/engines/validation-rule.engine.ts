import { Injectable } from '@nestjs/common';
import {
  IMarketplaceSchema,
  MarketplaceFieldDefinition,
  MarketplaceValidationResult,
  ValidationIssue,
  MissingFieldInfo,
  InvalidFieldInfo,
  ValidationSeverity,
  MarketplaceReadiness,
  FieldType,
  FieldCondition,
} from '../interfaces';
import {
  MAPPING_ERROR_CODES,
  READINESS_SCORE_WEIGHTS,
  MARKETPLACE_MAPPING_CONSTANTS,
} from '../constants';

@Injectable()
export class ValidationRuleEngine {
  /**
   * Validate a transformed payload against the marketplace schema.
   */
  validate(
    payload: Record<string, unknown>,
    schema: IMarketplaceSchema,
  ): MarketplaceValidationResult {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const missingFields: MissingFieldInfo[] = [];
    const invalidFields: InvalidFieldInfo[] = [];
    const unsupportedFields: string[] = [];

    const allDefinedFields = new Set([
      ...schema.requiredFields.map((f) => f.name),
      ...schema.optionalFields.map((f) => f.name),
    ]);

    // Check for unsupported fields in payload
    for (const key of Object.keys(payload)) {
      if (!allDefinedFields.has(key)) {
        unsupportedFields.push(key);
      }
    }

    // Validate required fields
    for (const fieldDef of schema.requiredFields) {
      this.validateField(fieldDef, payload, true, errors, warnings, missingFields, invalidFields);
    }

    // Validate optional fields that are present
    for (const fieldDef of schema.optionalFields) {
      if (fieldDef.name in payload) {
        this.validateField(fieldDef, payload, false, errors, warnings, missingFields, invalidFields);
      }
    }

    // Validate pricing requirements
    const pricingIssues = this.validatePricing(payload, schema);
    errors.push(...pricingIssues.errors);
    warnings.push(...pricingIssues.warnings);

    // Validate media
    const mediaIssues = this.validateMediaCounts(payload, schema);
    warnings.push(...mediaIssues);

    const readinessScore = this.computeReadinessScore(
      schema,
      payload,
      errors,
      missingFields,
    );
    const readinessStatus = this.computeReadinessStatus(readinessScore, errors);

    return {
      isValid: errors.length === 0,
      readinessScore,
      readinessStatus,
      errors,
      warnings,
      missingFields,
      invalidFields,
      unsupportedFields,
    };
  }

  private validateField(
    fieldDef: MarketplaceFieldDefinition,
    payload: Record<string, unknown>,
    required: boolean,
    errors: ValidationIssue[],
    warnings: ValidationIssue[],
    missingFields: MissingFieldInfo[],
    invalidFields: InvalidFieldInfo[],
  ): void {
    const value = payload[fieldDef.name];

    // Check conditions first
    if (fieldDef.conditions?.length) {
      const condMet = this.evaluateConditions(fieldDef.conditions, payload);
      if (!condMet) return; // field is conditional and condition not met
    }

    // Missing check
    if (value === undefined || value === null || value === '') {
      if (required) {
        missingFields.push({
          field: fieldDef.name,
          label: fieldDef.label,
          required: true,
        });
        errors.push({
          field: fieldDef.name,
          code: MAPPING_ERROR_CODES.REQUIRED_FIELD_MISSING,
          message: `Required field "${fieldDef.label}" is missing`,
          severity: ValidationSeverity.ERROR,
        });
      } else if (fieldDef.defaultValue === undefined) {
        missingFields.push({ field: fieldDef.name, label: fieldDef.label, required: false });
      }
      return;
    }

    // Type validation
    const typeError = this.validateType(fieldDef, value);
    if (typeError) {
      invalidFields.push({ field: fieldDef.name, value, reason: typeError });
      errors.push({
        field: fieldDef.name,
        code: MAPPING_ERROR_CODES.INVALID_FIELD_TYPE,
        message: typeError,
        severity: ValidationSeverity.ERROR,
      });
      return;
    }

    // Length validation
    if (
      typeof value === 'string' &&
      fieldDef.maxLength !== null &&
      fieldDef.maxLength !== undefined &&
      value.length > fieldDef.maxLength
    ) {
      errors.push({
        field: fieldDef.name,
        code: MAPPING_ERROR_CODES.FIELD_LENGTH_EXCEEDED,
        message: `Field "${fieldDef.label}" exceeds max length of ${fieldDef.maxLength} (got ${value.length})`,
        severity: ValidationSeverity.ERROR,
      });
      invalidFields.push({ field: fieldDef.name, value, reason: `Exceeds max length ${fieldDef.maxLength}` });
    }

    if (
      typeof value === 'string' &&
      fieldDef.minLength !== null &&
      fieldDef.minLength !== undefined &&
      value.length < fieldDef.minLength
    ) {
      errors.push({
        field: fieldDef.name,
        code: MAPPING_ERROR_CODES.INVALID_FIELD_VALUE,
        message: `Field "${fieldDef.label}" is shorter than min length of ${fieldDef.minLength}`,
        severity: ValidationSeverity.WARNING,
      });
    }

    // Allowed values
    if (fieldDef.allowedValues?.length && typeof value === 'string') {
      if (!fieldDef.allowedValues.includes(value)) {
        errors.push({
          field: fieldDef.name,
          code: MAPPING_ERROR_CODES.INVALID_FIELD_VALUE,
          message: `Field "${fieldDef.label}" value "${value}" not in allowed values: ${fieldDef.allowedValues.join(', ')}`,
          severity: ValidationSeverity.ERROR,
        });
        invalidFields.push({ field: fieldDef.name, value, reason: 'Not in allowed values' });
      }
    }

    // Numeric range
    if (
      typeof value === 'number' &&
      fieldDef.minValue !== null &&
      fieldDef.minValue !== undefined &&
      value < fieldDef.minValue
    ) {
      errors.push({
        field: fieldDef.name,
        code: MAPPING_ERROR_CODES.INVALID_FIELD_VALUE,
        message: `Field "${fieldDef.label}" value ${value} is below minimum ${fieldDef.minValue}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    if (
      typeof value === 'number' &&
      fieldDef.maxValue !== null &&
      fieldDef.maxValue !== undefined &&
      value > fieldDef.maxValue
    ) {
      errors.push({
        field: fieldDef.name,
        code: MAPPING_ERROR_CODES.INVALID_FIELD_VALUE,
        message: `Field "${fieldDef.label}" value ${value} exceeds maximum ${fieldDef.maxValue}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    void warnings; // suppress unused warning
  }

  private validateType(fieldDef: MarketplaceFieldDefinition, value: unknown): string | null {
    switch (fieldDef.type) {
      case FieldType.STRING:
      case FieldType.HTML:
        if (typeof value !== 'string') return `Expected string for "${fieldDef.label}"`;
        break;
      case FieldType.NUMBER:
        if (typeof value !== 'number' || isNaN(value)) return `Expected number for "${fieldDef.label}"`;
        break;
      case FieldType.BOOLEAN:
        if (typeof value !== 'boolean') return `Expected boolean for "${fieldDef.label}"`;
        break;
      case FieldType.ARRAY:
        if (!Array.isArray(value)) return `Expected array for "${fieldDef.label}"`;
        break;
      case FieldType.OBJECT:
        if (typeof value !== 'object' || Array.isArray(value) || value === null)
          return `Expected object for "${fieldDef.label}"`;
        break;
      case FieldType.URL:
        if (typeof value !== 'string') return `Expected URL string for "${fieldDef.label}"`;
        try {
          new URL(value);
        } catch {
          return `Invalid URL format for "${fieldDef.label}"`;
        }
        break;
      case FieldType.ENUM:
        if (typeof value !== 'string') return `Expected string enum for "${fieldDef.label}"`;
        break;
    }
    return null;
  }

  private validatePricing(
    payload: Record<string, unknown>,
    schema: IMarketplaceSchema,
  ): { errors: ValidationIssue[]; warnings: ValidationIssue[] } {
    const errors: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const req = schema.pricingRequirements;

    if (!req.required) return { errors, warnings };

    const price = payload['price'] as number | undefined;
    if (price === undefined || price === null) {
      errors.push({
        field: 'price',
        code: MAPPING_ERROR_CODES.PRICING_INVALID,
        message: 'Price is required for this marketplace',
        severity: ValidationSeverity.ERROR,
      });
      return { errors, warnings };
    }

    if (req.minPrice !== null && req.minPrice !== undefined && price < req.minPrice) {
      errors.push({
        field: 'price',
        code: MAPPING_ERROR_CODES.PRICING_INVALID,
        message: `Price ${price} is below minimum ${req.minPrice}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    const currency = payload['currency'] as string | undefined;
    if (currency && !req.allowedCurrencies.includes(currency)) {
      errors.push({
        field: 'currency',
        code: MAPPING_ERROR_CODES.PRICING_INVALID,
        message: `Currency ${currency} not allowed. Allowed: ${req.allowedCurrencies.join(', ')}`,
        severity: ValidationSeverity.ERROR,
      });
    }

    return { errors, warnings };
  }

  private validateMediaCounts(
    payload: Record<string, unknown>,
    schema: IMarketplaceSchema,
  ): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const images = (payload['images'] as unknown[]) ?? [];
    const req = schema.mediaRequirements;

    if (images.length < req.minImages) {
      issues.push({
        field: 'images',
        code: MAPPING_ERROR_CODES.MEDIA_VALIDATION_FAILED,
        message: `Image count ${images.length} is below required minimum ${req.minImages}`,
        severity: ValidationSeverity.ERROR,
        area: 'MEDIA',
      });
    }

    return issues;
  }

  private computeReadinessScore(
    schema: IMarketplaceSchema,
    payload: Record<string, unknown>,
    errors: ValidationIssue[],
    missingFields: MissingFieldInfo[],
  ): number {
    const totalRequired = schema.requiredFields.length;
    const missing = missingFields.filter((f) => f.required).length;
    const presentRequired = totalRequired - missing;

    const requiredScore =
      totalRequired > 0
        ? (presentRequired / totalRequired) * READINESS_SCORE_WEIGHTS.REQUIRED_FIELDS
        : READINESS_SCORE_WEIGHTS.REQUIRED_FIELDS;

    const images = (payload['images'] as unknown[]) ?? [];
    const mediaScore =
      images.length >= schema.mediaRequirements.minImages
        ? READINESS_SCORE_WEIGHTS.MEDIA
        : (images.length / Math.max(schema.mediaRequirements.minImages, 1)) *
          READINESS_SCORE_WEIGHTS.MEDIA;

    const hasContent =
      typeof payload['title'] === 'string' && payload['title'].length > 0;
    const contentScore = hasContent ? READINESS_SCORE_WEIGHTS.CONTENT : 0;

    const hasPrice = payload['price'] !== undefined && payload['price'] !== null;
    const pricingScore =
      !schema.pricingRequirements.required || hasPrice ? READINESS_SCORE_WEIGHTS.PRICING : 0;

    const hasVariants =
      !schema.variantRules.supported ||
      (Array.isArray(payload['variants']) && (payload['variants'] as unknown[]).length > 0);
    const variantScore = hasVariants ? READINESS_SCORE_WEIGHTS.VARIANTS : 0;

    const contentErrors = errors.filter((e) => e.severity === ValidationSeverity.ERROR).length;
    const penalty = Math.min(contentErrors * 5, 30);

    return Math.max(
      0,
      Math.round(requiredScore + mediaScore + contentScore + pricingScore + variantScore - penalty),
    );
  }

  private computeReadinessStatus(
    score: number,
    errors: ValidationIssue[],
  ): MarketplaceReadiness {
    const criticalErrors = errors.filter((e) => e.severity === ValidationSeverity.ERROR);
    if (criticalErrors.length > 0) return MarketplaceReadiness.NOT_READY;
    if (score >= MARKETPLACE_MAPPING_CONSTANTS.READY_THRESHOLD) return MarketplaceReadiness.READY;
    if (score >= MARKETPLACE_MAPPING_CONSTANTS.WARNINGS_THRESHOLD) return MarketplaceReadiness.WARNINGS;
    return MarketplaceReadiness.INCOMPLETE;
  }

  private evaluateConditions(
    conditions: FieldCondition[],
    context: Record<string, unknown>,
  ): boolean {
    return conditions.every((cond) => {
      const ctxValue = context[cond.field];
      switch (cond.operator) {
        case 'eq': return ctxValue === cond.value;
        case 'neq': return ctxValue !== cond.value;
        case 'in': return Array.isArray(cond.value) && (cond.value as unknown[]).includes(ctxValue);
        case 'nin': return Array.isArray(cond.value) && !(cond.value as unknown[]).includes(ctxValue);
        case 'exists': return ctxValue !== undefined && ctxValue !== null;
        case 'not_exists': return ctxValue === undefined || ctxValue === null;
        default: return true;
      }
    });
  }
}
