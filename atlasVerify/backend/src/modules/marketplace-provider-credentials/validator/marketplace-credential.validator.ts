import { Injectable } from '@nestjs/common';
import {
  CredentialFieldSchema,
  CredentialValidationResult,
  IMarketplaceProviderCredential,
  ProviderCredentialSchema,
} from '../interfaces';
import { MP_CREDENTIAL_CONSTANTS, MP_CREDENTIAL_ERROR_CODES } from '../constants';

interface ValidateContext {
  providerKey: string;
  isCreate?: boolean;
  schema?: ProviderCredentialSchema | null;
  /** plain-text fields — only provided during create/update validation */
  plainFields?: Record<string, string>;
}

/**
 * Validates credential records against provider-specific schemas and
 * general business rules.
 *
 * Never receives nor logs decrypted field values in errors.
 */
@Injectable()
export class MarketplaceCredentialValidator {
  validate(
    credential: Partial<IMarketplaceProviderCredential>,
    context: ValidateContext,
  ): CredentialValidationResult {
    const errors: CredentialValidationResult['errors'] = [];
    const warnings: string[] = [];

    // ── Basic required fields on create ──────────────────────
    if (context.isCreate) {
      if (!context.providerKey?.trim()) {
        errors.push({ field: 'providerKey', message: 'providerKey is required', code: MP_CREDENTIAL_ERROR_CODES.MISSING_REQUIRED_FIELD });
      }
      if (!credential.credentialSetName?.trim()) {
        errors.push({ field: 'credentialSetName', message: 'credentialSetName is required', code: MP_CREDENTIAL_ERROR_CODES.MISSING_REQUIRED_FIELD });
      }
      if (!credential.workspaceId?.trim()) {
        errors.push({ field: 'workspaceId', message: 'workspaceId is required', code: MP_CREDENTIAL_ERROR_CODES.MISSING_REQUIRED_FIELD });
      }
    }

    // ── Expiry ────────────────────────────────────────────────
    const expired = !!(credential.expiresAt && credential.expiresAt < new Date());
    if (expired) {
      errors.push({ field: 'expiresAt', message: 'Credential has expired', code: MP_CREDENTIAL_ERROR_CODES.CREDENTIAL_EXPIRED });
    } else if (
      credential.expiresAt &&
      credential.expiresAt.getTime() - Date.now() < MP_CREDENTIAL_CONSTANTS.EXPIRY_WARNING_WINDOW_MS
    ) {
      warnings.push(`Credential will expire at ${credential.expiresAt.toISOString()}`);
    }

    // ── Provider schema validation ────────────────────────────
    const missingFields: string[] = [];
    if (context.schema && context.plainFields) {
      missingFields.push(...this.validateSchema(context.schema, context.plainFields, errors));
    }

    // ── Field-length guard (on plain fields) ──────────────────
    if (context.plainFields) {
      for (const [key, value] of Object.entries(context.plainFields)) {
        if (value.length > MP_CREDENTIAL_CONSTANTS.MAX_FIELD_VALUE_LENGTH) {
          errors.push({
            field: key,
            message: `Field '${key}' exceeds maximum allowed length`,
            code: MP_CREDENTIAL_ERROR_CODES.FIELD_TOO_LONG,
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      expired,
      missingFields,
    };
  }

  /**
   * Validates plain-text fields against the provider's credential schema.
   * Returns the list of missing required fields.
   */
  validateSchema(
    schema: ProviderCredentialSchema,
    plainFields: Record<string, string>,
    errors: CredentialValidationResult['errors'],
  ): string[] {
    const missing: string[] = [];

    for (const fieldDef of schema.fields) {
      if (!fieldDef.required) continue;

      const value = plainFields[fieldDef.key];
      if (!value || value.trim() === '') {
        missing.push(fieldDef.key);
        errors.push({
          field: fieldDef.key,
          message: `Required field '${fieldDef.key}' is missing`,
          code: MP_CREDENTIAL_ERROR_CODES.MISSING_REQUIRED_FIELD,
        });
        continue;
      }

      // Pattern validation
      if (fieldDef.pattern && !new RegExp(fieldDef.pattern).test(value)) {
        errors.push({
          field: fieldDef.key,
          message: `Field '${fieldDef.key}' does not match required pattern`,
          code: MP_CREDENTIAL_ERROR_CODES.SCHEMA_VALIDATION_FAILED,
        });
      }

      // Length validations
      if (fieldDef.minLength !== undefined && value.length < fieldDef.minLength) {
        errors.push({
          field: fieldDef.key,
          message: `Field '${fieldDef.key}' is too short (min ${fieldDef.minLength})`,
          code: MP_CREDENTIAL_ERROR_CODES.SCHEMA_VALIDATION_FAILED,
        });
      }

      if (fieldDef.maxLength !== undefined && value.length > fieldDef.maxLength) {
        errors.push({
          field: fieldDef.key,
          message: `Field '${fieldDef.key}' is too long (max ${fieldDef.maxLength})`,
          code: MP_CREDENTIAL_ERROR_CODES.SCHEMA_VALIDATION_FAILED,
        });
      }
    }

    return missing;
  }

  /**
   * Validates only that required fields exist (no plain-text access needed).
   */
  validateRequiredFieldKeys(
    schema: ProviderCredentialSchema,
    encryptedFields: Record<string, string>,
  ): { valid: boolean; missing: string[] } {
    const missing = schema.fields
      .filter((f) => f.required && !encryptedFields[f.key])
      .map((f) => f.key);
    return { valid: missing.length === 0, missing };
  }
}
