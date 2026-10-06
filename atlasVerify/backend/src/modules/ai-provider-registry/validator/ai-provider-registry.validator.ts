import { Injectable } from '@nestjs/common';
import { AiCapability, IAiModelDescriptor } from '../../../ai/interfaces';
import { IRegistryValidationError, IRegistryValidationResult } from '../interfaces';
import { AI_PROVIDER_REGISTRY_CONSTANTS } from '../constants';

export interface IAiProviderRegistryValidationInput {
  providerKey: string;
  adapterKey: string;
  displayName: string;
  version: string;
  capabilities: AiCapability[];
  supportedModels: IAiModelDescriptor[];
  regions?: string[];
  priority?: number;
  fallbackOrder?: string[];
}

/**
 * AiProviderRegistryValidator
 *
 * Structural validation of a registry entry's declared metadata — no
 * network calls, no concrete provider/adapter logic.
 */
@Injectable()
export class AiProviderRegistryValidator {
  validate(input: IAiProviderRegistryValidationInput): IRegistryValidationResult {
    const errors: IRegistryValidationError[] = [];
    const warnings: string[] = [];

    if (!input.providerKey?.trim()) {
      errors.push({ field: 'providerKey', message: 'providerKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (!input.adapterKey?.trim()) {
      errors.push({ field: 'adapterKey', message: 'adapterKey is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (!input.displayName?.trim()) {
      errors.push({ field: 'displayName', message: 'displayName is required', code: 'MISSING_REQUIRED_FIELD' });
    }
    if (!input.version?.trim()) {
      errors.push({ field: 'version', message: 'version is required', code: 'MISSING_REQUIRED_FIELD' });
    }

    if (!input.capabilities || input.capabilities.length === 0) {
      errors.push({
        field: 'capabilities',
        message: 'At least one capability is required',
        code: 'MISSING_REQUIRED_FIELD',
      });
    }

    const modelIds = new Set<string>();
    for (const model of input.supportedModels ?? []) {
      if (!model.modelId?.trim()) {
        errors.push({ field: 'supportedModels', message: 'Each model requires a modelId', code: 'INVALID_MODEL' });
        continue;
      }
      if (modelIds.has(model.modelId)) {
        errors.push({
          field: 'supportedModels',
          message: `Duplicate modelId '${model.modelId}' in supportedModels`,
          code: 'DUPLICATE_MODEL',
        });
      }
      modelIds.add(model.modelId);

      if (input.capabilities?.length) {
        const declared = new Set(input.capabilities);
        const unsupported = model.capabilities.filter((c) => !declared.has(c));
        if (unsupported.length > 0) {
          warnings.push(
            `Model '${model.modelId}' declares capabilities not listed at the provider level: ${unsupported.join(', ')}`,
          );
        }
      }
    }

    if (
      input.priority !== undefined &&
      (input.priority < AI_PROVIDER_REGISTRY_CONSTANTS.MIN_PRIORITY ||
        input.priority > AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PRIORITY)
    ) {
      errors.push({
        field: 'priority',
        message: `priority must be between ${AI_PROVIDER_REGISTRY_CONSTANTS.MIN_PRIORITY} and ${AI_PROVIDER_REGISTRY_CONSTANTS.MAX_PRIORITY}`,
        code: 'INVALID_PRIORITY',
      });
    }

    if (input.fallbackOrder && input.fallbackOrder.includes(input.providerKey)) {
      errors.push({
        field: 'fallbackOrder',
        message: 'A provider cannot list itself as its own fallback',
        code: 'INCOMPATIBLE_FALLBACK',
      });
    }
    if (input.fallbackOrder && input.fallbackOrder.length > AI_PROVIDER_REGISTRY_CONSTANTS.MAX_FALLBACK_CHAIN_LENGTH) {
      errors.push({
        field: 'fallbackOrder',
        message: `fallbackOrder cannot exceed ${AI_PROVIDER_REGISTRY_CONSTANTS.MAX_FALLBACK_CHAIN_LENGTH} entries`,
        code: 'INVALID_FALLBACK_ORDER',
      });
    }

    for (const region of input.regions ?? []) {
      if (!region?.trim()) {
        errors.push({ field: 'regions', message: 'regions cannot contain empty values', code: 'INVALID_REGION' });
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }
}
