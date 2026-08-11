import { Injectable } from '@nestjs/common';
import {
  CapabilityValidationRequest,
  CapabilityValidationResult,
  CapabilityStatus,
  CapabilitySupportLevel,
  MarketplaceAccountStatus,
  MarketplaceProviderStatus,
} from '../interfaces';

// Re-import account/provider status from foundation
import {
  MarketplaceAccountStatus as FoundationAccountStatus,
  MarketplaceProviderStatus as FoundationProviderStatus,
} from '../../marketplace-provider/interfaces';

// Re-export to avoid drift
export {
  FoundationAccountStatus as MarketplaceAccountStatus,
  FoundationProviderStatus as MarketplaceProviderStatus,
} from '../../marketplace-provider/interfaces';

import { IMarketplaceCapabilityDefinition, IMarketplaceProviderCapabilityDeclaration } from '../interfaces';

@Injectable()
export class MarketplaceCapabilityValidator {

  validate(
    request: CapabilityValidationRequest,
    definition?: IMarketplaceCapabilityDefinition | null,
    declaration?: IMarketplaceProviderCapabilityDeclaration | null,
  ): CapabilityValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Capability exists
    if (!definition) {
      errors.push(`Capability '${request.capabilityKey}' does not exist`);
      return { valid: false, errors, warnings };
    }

    // Capability is active
    if (definition.status !== CapabilityStatus.ACTIVE && definition.status !== CapabilityStatus.EXPERIMENTAL) {
      errors.push(`Capability '${request.capabilityKey}' is not active (status: ${definition.status})`);
    }
    if (definition.status === CapabilityStatus.DEPRECATED) {
      warnings.push(`Capability '${request.capabilityKey}' is deprecated`);
    }
    if (definition.status === CapabilityStatus.EXPERIMENTAL) {
      warnings.push(`Capability '${request.capabilityKey}' is experimental`);
    }

    // Provider supports capability
    if (!declaration) {
      errors.push(`Provider '${request.providerKey}' has not declared support for '${request.capabilityKey}'`);
      return { valid: false, errors, warnings };
    }

    // Declaration is active
    if (declaration.status !== CapabilityStatus.ACTIVE && declaration.status !== CapabilityStatus.EXPERIMENTAL) {
      errors.push(`Provider declaration for '${request.capabilityKey}' is not active`);
    }

    // Support level is not UNSUPPORTED
    if (declaration.supportLevel === CapabilitySupportLevel.UNSUPPORTED) {
      errors.push(`Provider '${request.providerKey}' does not support capability '${request.capabilityKey}'`);
    }

    // Provider status
    if (request.providerStatus && request.providerStatus === FoundationProviderStatus.DEPRECATED) {
      warnings.push(`Provider '${request.providerKey}' is deprecated`);
    }
    if (request.providerStatus && (
      request.providerStatus === FoundationProviderStatus.INACTIVE ||
      request.providerStatus === FoundationProviderStatus.MAINTENANCE
    )) {
      errors.push(`Provider '${request.providerKey}' is not available (status: ${request.providerStatus})`);
    }

    // Marketplace account status
    if (request.accountStatus && (
      request.accountStatus === FoundationAccountStatus.INACTIVE ||
      request.accountStatus === FoundationAccountStatus.SUSPENDED
    )) {
      errors.push(`Marketplace account is not active (status: ${request.accountStatus})`);
    }
    if (request.accountStatus && request.accountStatus === FoundationAccountStatus.CREDENTIAL_EXPIRED) {
      errors.push(`Marketplace account credentials are expired`);
    }

    // Country support
    if (request.country && declaration.countryAvailability.length > 0) {
      if (!declaration.countryAvailability.includes(request.country.toUpperCase())) {
        errors.push(`Capability '${request.capabilityKey}' is not available in country '${request.country}'`);
      }
    }

    // Region support
    if (request.region && declaration.regionAvailability.length > 0) {
      if (!declaration.regionAvailability.includes(request.region)) {
        errors.push(`Capability '${request.capabilityKey}' is not available in region '${request.region}'`);
      }
    }

    // Country restrictions (definition level)
    if (request.country && definition.countryRestrictions.length > 0) {
      if (definition.countryRestrictions.includes(request.country.toUpperCase())) {
        errors.push(`Capability '${request.capabilityKey}' is restricted in country '${request.country}'`);
      }
    }

    // Region restrictions
    if (request.region && definition.regionRestrictions.length > 0) {
      if (definition.regionRestrictions.includes(request.region)) {
        errors.push(`Capability '${request.capabilityKey}' is restricted in region '${request.region}'`);
      }
    }

    // Marketplace restrictions
    if (request.marketplaceKey && definition.marketplaceRestrictions.length > 0) {
      if (definition.marketplaceRestrictions.includes(request.marketplaceKey)) {
        errors.push(`Capability '${request.capabilityKey}' is restricted for marketplace '${request.marketplaceKey}'`);
      }
    }

    // Required operations
    if (request.requiredOperations && request.requiredOperations.length > 0) {
      for (const op of request.requiredOperations) {
        if (!declaration.supportedOperations.includes(op)) {
          errors.push(`Provider '${request.providerKey}' does not support operation '${op}' for capability '${request.capabilityKey}'`);
        }
      }
    }

    // Required version
    if (request.requiredVersion) {
      if (declaration.capabilityVersion && declaration.capabilityVersion !== request.requiredVersion) {
        warnings.push(
          `Required capability version '${request.requiredVersion}' does not match declared version '${declaration.capabilityVersion}'`,
        );
      }
    }

    // Feature flags
    if (request.featureFlags) {
      for (const [flag, required] of Object.entries(request.featureFlags)) {
        const declared = declaration.featureRestrictions[flag];
        if (required && declared === false) {
          errors.push(`Feature flag '${flag}' is disabled for this provider capability`);
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  validateDefinitionPayload(data: {
    capabilityKey?: string;
    name?: string;
    category?: string;
  }): CapabilityValidationResult {
    const errors: string[] = [];
    if (!data.capabilityKey || !data.capabilityKey.trim()) {
      errors.push('capabilityKey is required');
    }
    if (!data.name || !data.name.trim()) {
      errors.push('name is required');
    }
    if (!data.category || !data.category.trim()) {
      errors.push('category is required');
    }
    return { valid: errors.length === 0, errors, warnings: [] };
  }
}
