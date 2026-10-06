import { Injectable } from '@nestjs/common';
import { CredentialType, ICredentialValidationError, ICredentialValidationResult } from '../interfaces';

const REQUIRED_FIELDS_BY_TYPE: Record<CredentialType, string[]> = {
  [CredentialType.API_KEY]: ['apiKey'],
  [CredentialType.OAUTH]: ['accessToken'],
  [CredentialType.ACCESS_TOKEN]: ['accessToken'],
  [CredentialType.REFRESH_TOKEN]: ['refreshToken'],
  [CredentialType.CUSTOM]: [],
};

export interface IAiProviderCredentialValidationContext {
  type: CredentialType;
  credentialSetName?: string;
  expiresAt?: string;
  isCreate?: boolean;
}

/**
 * AiProviderCredentialValidator
 *
 * Structural validation of the PLAINTEXT field map supplied by the caller,
 * performed before encryption and never logged. Pure structural checks —
 * no network calls, no provider-specific logic (that belongs to
 * `AiProviderCredentialConnectionValidator`, which validates connectivity
 * through the AI Provider Foundation instead).
 */
@Injectable()
export class AiProviderCredentialValidator {
  validate(
    fields: Record<string, string>,
    context: IAiProviderCredentialValidationContext,
  ): ICredentialValidationResult {
    const errors: ICredentialValidationError[] = [];
    const warnings: string[] = [];

    if (context.isCreate && !context.credentialSetName?.trim()) {
      errors.push({
        field: 'credentialSetName',
        message: 'credentialSetName is required',
        code: 'MISSING_REQUIRED_FIELD',
      });
    }

    // Required-key presence is only enforced on full creation — a partial
    // update legitimately supplies just the fields being changed, and
    // whether the full set (including untouched pre-existing fields) is
    // complete was already established when the credential was created.
    if (context.isCreate) {
      const requiredKeys = REQUIRED_FIELDS_BY_TYPE[context.type] ?? [];
      for (const key of requiredKeys) {
        if (!fields[key]?.trim()) {
          errors.push({
            field: `fields.${key}`,
            message: `'${key}' is required for credential type '${context.type}'`,
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
      }

      if (context.type === CredentialType.CUSTOM && Object.keys(fields).length === 0) {
        errors.push({
          field: 'fields',
          message: 'At least one field is required for CUSTOM credentials',
          code: 'MISSING_REQUIRED_FIELD',
        });
      }
    }

    for (const [key, value] of Object.entries(fields)) {
      if (typeof value !== 'string' || value.trim().length === 0) {
        errors.push({ field: `fields.${key}`, message: `'${key}' must be a non-empty string`, code: 'INVALID_FIELD_VALUE' });
      }
    }

    if (context.expiresAt) {
      const expiresAt = new Date(context.expiresAt);
      if (Number.isNaN(expiresAt.getTime())) {
        errors.push({ field: 'expiresAt', message: 'expiresAt must be a valid date', code: 'INVALID_EXPIRY' });
      } else if (context.isCreate && expiresAt.getTime() <= Date.now()) {
        errors.push({ field: 'expiresAt', message: 'expiresAt must be in the future', code: 'INVALID_EXPIRY' });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
