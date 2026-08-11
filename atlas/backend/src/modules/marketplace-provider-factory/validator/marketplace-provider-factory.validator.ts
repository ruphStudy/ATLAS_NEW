import { Injectable } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import {
  MarketplaceCapability,
  MarketplaceProviderStatus,
} from '../../marketplace-provider/interfaces';
import { CredentialStatus } from '../../marketplace-provider-credentials/interfaces';
import { FactoryValidationResult, ProviderFactoryRequest } from '../interfaces';
import { MP_FACTORY_ERROR_CODES } from '../constants';

/**
 * Validates a factory request before provider resolution begins.
 * Separating validation from resolution keeps each component focused.
 */
@Injectable()
export class MarketplaceProviderFactoryValidator {
  constructor(private readonly registry: MarketplaceProviderRegistry) {}

  /**
   * Validates the factory request and checks the provider is registered and active.
   */
  validate(request: ProviderFactoryRequest): FactoryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields
    if (!request.workspaceId?.trim()) {
      errors.push(`workspaceId is required [${MP_FACTORY_ERROR_CODES.PROVIDER_NOT_FOUND}]`);
    }

    if (request.providerKey) {
      const key = request.providerKey.toUpperCase();

      if (!this.registry.isRegistered(key)) {
        errors.push(
          `Provider '${key}' is not registered [${MP_FACTORY_ERROR_CODES.PROVIDER_NOT_FOUND}]`,
        );
      } else {
        const status = this.registry.getStatus(key);
        if (status === MarketplaceProviderStatus.INACTIVE) {
          errors.push(
            `Provider '${key}' is disabled [${MP_FACTORY_ERROR_CODES.PROVIDER_DISABLED}]`,
          );
        } else if (
          status === MarketplaceProviderStatus.DEPRECATED ||
          status === MarketplaceProviderStatus.MAINTENANCE
        ) {
          warnings.push(`Provider '${key}' is in '${status}' state`);
        }

        // Capability check
        if (request.capability) {
          const adapter = this.registry.get(key);
          if (!adapter.supportsCapability(request.capability)) {
            errors.push(
              `Provider '${key}' does not support capability '${request.capability}' [${MP_FACTORY_ERROR_CODES.UNSUPPORTED_CAPABILITY}]`,
            );
          }

          if (request.country && !adapter.supportsCountry(request.country)) {
            errors.push(
              `Provider '${key}' does not support country '${request.country}' [${MP_FACTORY_ERROR_CODES.UNSUPPORTED_COUNTRY}]`,
            );
          }

          if (request.region && !adapter.supportsRegion(request.region)) {
            errors.push(
              `Provider '${key}' does not support region '${request.region}' [${MP_FACTORY_ERROR_CODES.UNSUPPORTED_REGION}]`,
            );
          }
        }
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  /**
   * Validates that a credential record is in a usable state.
   */
  validateCredentialState(
    status: CredentialStatus,
    expiresAt?: Date | null,
  ): { valid: boolean; error?: string } {
    if (status === CredentialStatus.REVOKED) {
      return { valid: false, error: `Credential has been revoked [${MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING}]` };
    }
    if (status === CredentialStatus.DISABLED) {
      return { valid: false, error: `Credential is disabled [${MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING}]` };
    }
    if (status === CredentialStatus.EXPIRED || (expiresAt && expiresAt < new Date())) {
      return { valid: false, error: `Credential has expired [${MP_FACTORY_ERROR_CODES.CREDENTIALS_EXPIRED}]` };
    }
    return { valid: true };
  }
}
