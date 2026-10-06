import { Injectable } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceCapabilityManager } from '../../marketplace-capability/manager/marketplace-capability.manager';
import { CountryRegistry } from '../registry/country.registry';
import { CountryRepository } from '../repository/country.repository';
import {
  CountryStatus,
  CountryValidationIssueType,
  CountryValidationRequest,
  CountryValidationResult,
  ICountryProviderAvailability,
} from '../interfaces';

/**
 * CountryValidator
 *
 * Validates provider/marketplace/currency/tax/feature combinations for a
 * country. Never re-implements marketplace/provider support logic — checks
 * are delegated entirely to the existing `MarketplaceProviderRegistry`
 * (`supportsCountry`/`supportsRegion`) and `MarketplaceCapabilityManager`
 * (capability resolution), so a marketplace's own capability/country
 * declarations remain the single source of truth. No marketplace-specific
 * branching lives here.
 */
@Injectable()
export class CountryValidator {
  constructor(
    private readonly countryRegistry: CountryRegistry,
    private readonly repository: CountryRepository,
    private readonly providerRegistry: MarketplaceProviderRegistry,
    private readonly capabilityManager: MarketplaceCapabilityManager,
  ) {}

  async validate(request: CountryValidationRequest): Promise<CountryValidationResult> {
    const issues: CountryValidationResult['issues'] = [];
    const warnings: string[] = [];

    const country = this.countryRegistry.get(request.countryCode);
    if (!country) {
      issues.push({
        type: CountryValidationIssueType.COUNTRY_NOT_SUPPORTED,
        message: `Country '${request.countryCode}' is not registered`,
      });
      return { valid: false, issues, warnings };
    }

    if (country.status !== CountryStatus.ACTIVE) {
      issues.push({
        type: CountryValidationIssueType.COUNTRY_NOT_SUPPORTED,
        message: `Country '${request.countryCode}' is ${country.status}`,
      });
    }

    if (request.providerKey) {
      if (!this.providerRegistry.isRegistered(request.providerKey)) {
        issues.push({
          type: CountryValidationIssueType.PROVIDER_NOT_SUPPORTED,
          message: `Provider '${request.providerKey}' is not registered`,
        });
      } else {
        const adapter = this.providerRegistry.get(request.providerKey);
        if (!adapter.supportsCountry(country.code)) {
          issues.push({
            type: CountryValidationIssueType.PROVIDER_NOT_SUPPORTED,
            message: `Provider '${request.providerKey}' does not support country '${country.code}'`,
          });
        }
        if (country.region && !adapter.supportsRegion(country.region)) {
          warnings.push(`Provider '${request.providerKey}' does not declare support for region '${country.region}'`);
        }
      }

      if (request.capability) {
        const capabilityResult = await this.capabilityManager.validate({
          workspaceId: request.workspaceId,
          providerKey: request.providerKey,
          capabilityKey: request.capability,
          marketplaceKey: request.marketplaceKey,
          country: country.code,
          featureFlags: request.featureFlags,
        });
        if (!capabilityResult.valid) {
          issues.push({
            type: CountryValidationIssueType.MARKETPLACE_NOT_SUPPORTED,
            message: capabilityResult.errors.join('; '),
          });
        }
        warnings.push(...capabilityResult.warnings);
      }
    }

    if (request.providerDomain && request.providerKey) {
      const availability = (await this.repository.findProviderAvailability(country.code, {
        domain: request.providerDomain,
        providerKey: request.providerKey,
        workspaceId: request.workspaceId,
      })) as unknown as ICountryProviderAvailability[];

      // Workspace-scoped record wins over the global one when both exist.
      const record =
        availability.find((a) => a.workspaceId === request.workspaceId) ??
        availability.find((a) => !a.workspaceId);

      if (!record || !record.isAvailable) {
        issues.push({
          type: CountryValidationIssueType.PROVIDER_DOMAIN_UNAVAILABLE,
          message: `Provider '${request.providerKey}' is not configured as available for ${request.providerDomain} in country '${country.code}'`,
        });
      }
    }

    if (request.currency && request.currency.toUpperCase() !== country.currency.toUpperCase()) {
      const supported = country.supportedCurrencies.map((c) => c.toUpperCase());
      if (!supported.includes(request.currency.toUpperCase())) {
        issues.push({
          type: CountryValidationIssueType.CURRENCY_MISMATCH,
          message: `Currency '${request.currency}' is not supported in country '${country.code}' (default '${country.currency}')`,
        });
      } else {
        warnings.push(
          `Requested currency '${request.currency}' differs from country '${country.code}' default currency '${country.currency}'`,
        );
      }
    }

    if (request.locale && request.locale.toLowerCase() !== country.locale.toLowerCase()) {
      const supported = country.supportedLocales.map((l) => l.toLowerCase());
      if (!supported.includes(request.locale.toLowerCase())) {
        issues.push({
          type: CountryValidationIssueType.LOCALE_NOT_SUPPORTED,
          message: `Locale '${request.locale}' is not supported in country '${country.code}' (default '${country.locale}')`,
        });
      }
    }

    if (!country.taxRegime) {
      warnings.push(`Country '${country.code}' has no tax regime configured`);
    }

    return { valid: issues.length === 0, issues, warnings };
  }
}
