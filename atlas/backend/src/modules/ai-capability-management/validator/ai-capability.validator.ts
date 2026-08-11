import { Injectable } from '@nestjs/common';
import { AiCapability } from '../../../ai/interfaces';
import {
  CapabilityOverrideScope,
  IAiCapabilityLimits,
  IAiCapabilityValidationError,
  IAiCapabilityValidationResult,
} from '../interfaces';

export interface IAiCapabilityDefinitionValidationInput {
  capabilityKey: AiCapability;
  version: string;
  displayName: string;
  limits?: IAiCapabilityLimits;
  dependencies?: AiCapability[];
  requiredRoles?: string[];
}

export interface IAiCapabilityOverrideValidationInput {
  scope: CapabilityOverrideScope;
  capabilityKey: AiCapability;
  workspaceId?: string;
  providerKey?: string;
  modelId?: string;
  priority?: number;
}

/**
 * AiCapabilityValidator
 *
 * Structural validation only — no provider API calls, no concrete
 * adapter logic.
 */
@Injectable()
export class AiCapabilityValidator {
  validateDefinition(input: IAiCapabilityDefinitionValidationInput): IAiCapabilityValidationResult {
    const errors: IAiCapabilityValidationError[] = [];
    const warnings: string[] = [];

    if (!input.capabilityKey) {
      errors.push({ field: 'capabilityKey', message: 'capabilityKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (!input.displayName?.trim()) {
      errors.push({ field: 'displayName', message: 'displayName is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (!input.version?.trim()) {
      errors.push({ field: 'version', message: 'version is required', code: 'MISSING_REQUIRED_FIELD' });
    }

    if (input.dependencies?.includes(input.capabilityKey)) {
      errors.push({
        field: 'dependencies',
        message: 'A capability cannot depend on itself',
        code: 'INVALID_DEPENDENCY',
      });
    }

    for (const [field, value] of Object.entries(input.limits ?? {})) {
      if (typeof value === 'number' && value < 0) {
        errors.push({ field: `limits.${field}`, message: `${field} must be >= 0`, code: 'INVALID_LIMIT' });
      }
    }

    if (input.requiredRoles && input.requiredRoles.some((role) => !role?.trim())) {
      errors.push({ field: 'requiredRoles', message: 'requiredRoles cannot contain empty values', code: 'INVALID_ROLE' });
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateOverride(input: IAiCapabilityOverrideValidationInput): IAiCapabilityValidationResult {
    const errors: IAiCapabilityValidationError[] = [];
    const warnings: string[] = [];

    if (!input.capabilityKey) {
      errors.push({ field: 'capabilityKey', message: 'capabilityKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }

    switch (input.scope) {
      case CapabilityOverrideScope.WORKSPACE:
        if (!input.workspaceId) {
          errors.push({
            field: 'workspaceId',
            message: 'workspaceId is required when scope is WORKSPACE',
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
        break;
      case CapabilityOverrideScope.PROVIDER:
        if (!input.providerKey) {
          errors.push({
            field: 'providerKey',
            message: 'providerKey is required when scope is PROVIDER',
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
        if (input.modelId) {
          warnings.push('modelId is ignored for PROVIDER-scoped overrides');
        }
        break;
      case CapabilityOverrideScope.MODEL:
        if (!input.providerKey || !input.modelId) {
          errors.push({
            field: 'modelId',
            message: 'providerKey and modelId are required when scope is MODEL',
            code: 'MISSING_REQUIRED_FIELD',
          });
        }
        break;
      case CapabilityOverrideScope.GLOBAL:
      default:
        break;
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
