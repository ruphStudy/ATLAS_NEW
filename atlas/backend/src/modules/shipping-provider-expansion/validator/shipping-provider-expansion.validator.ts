import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { ShippingProviderRegistry } from '@modules/shipping-provider/registry/shipping-provider.registry';
import { IShippingProviderAdapter } from '@modules/shipping-provider/interfaces';
import {
  AdapterCompatibilityStatus,
  ExpansionValidationIssueType,
  IAdapterCompatibilityResult,
  IExpansionValidationResult,
} from '../interfaces';

export interface ExpansionCandidate {
  providerKey: string;
  countryCodes: string[];
}

/**
 * ShippingProviderExpansionValidator
 *
 * Validates an expansion's cross-module references (country) against
 * their owning services, and structurally validates a registered
 * adapter against the `IShippingProviderAdapter` contract — a runtime
 * check that matters precisely because adapters register themselves
 * dynamically at module-init time, outside compile-time-checked code
 * paths. Never re-implements the foundation registry, factory, or
 * health monitor it reads from.
 */
@Injectable()
export class ShippingProviderExpansionValidator {
  constructor(
    private readonly countryService: CountryService,
    private readonly shippingProviderRegistry: ShippingProviderRegistry,
  ) {}

  async validateExpansion(candidate: ExpansionCandidate): Promise<IExpansionValidationResult> {
    const issues: IExpansionValidationResult['issues'] = [];
    const warnings: string[] = [];

    for (const countryCode of candidate.countryCodes) {
      try {
        await this.countryService.findByCode(countryCode);
      } catch {
        issues.push({ type: ExpansionValidationIssueType.UNKNOWN_COUNTRY, message: `Country '${countryCode}' is not registered` });
      }
    }

    if (!this.shippingProviderRegistry.isRegistered(candidate.providerKey)) {
      warnings.push(`Provider '${candidate.providerKey}' is not yet registered in the Shipping Provider Foundation — this expansion can stay DRAFT until it is`);
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /**
   * Structurally validates the registered adapter for `providerKey` against
   * the `IShippingProviderAdapter` contract — required metadata fields,
   * required capability declarations, and every required method being an
   * actual function. This is a runtime duck-type check (not merely relying
   * on TypeScript's compile-time typing) precisely because adapters
   * register themselves dynamically.
   */
  async validateAdapterCompatibility(providerKey: string): Promise<IAdapterCompatibilityResult> {
    const checkedAt = new Date();

    if (!this.shippingProviderRegistry.isRegistered(providerKey)) {
      return {
        providerKey,
        status: AdapterCompatibilityStatus.INCOMPATIBLE,
        issues: [`No adapter is registered for provider '${providerKey}' in the Shipping Provider Registry`],
        checkedAt,
      };
    }

    const adapter = this.shippingProviderRegistry.get(providerKey);
    const issues = this.checkAdapterShape(adapter);

    return {
      providerKey,
      status: issues.length === 0 ? AdapterCompatibilityStatus.COMPATIBLE : AdapterCompatibilityStatus.INCOMPATIBLE,
      issues,
      checkedAt,
    };
  }

  private checkAdapterShape(adapter: IShippingProviderAdapter): string[] {
    const issues: string[] = [];
    const metadata = adapter.metadata;

    if (!metadata || typeof metadata !== 'object') {
      issues.push('Adapter is missing required `metadata`');
      return issues;
    }

    if (!metadata.providerKey) issues.push('metadata.providerKey is required');
    if (!metadata.displayName) issues.push('metadata.displayName is required');
    if (!metadata.version) issues.push('metadata.version is required');
    if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
      issues.push('metadata.capabilities must declare at least one capability');
    }
    if (!Array.isArray(metadata.supportedCountries)) issues.push('metadata.supportedCountries must be an array');
    if (!Array.isArray(metadata.supportedRegions)) issues.push('metadata.supportedRegions must be an array');
    if (!Array.isArray(metadata.serviceLevels)) issues.push('metadata.serviceLevels must be an array');

    const requiredMethods: Array<keyof IShippingProviderAdapter> = [
      'supportsCapability',
      'supportsCountry',
      'supportsRegion',
      'supportsServiceLevel',
      'getRateQuote',
      'createShipment',
      'generateLabel',
      'schedulePickup',
      'cancelPickup',
      'trackShipment',
      'cancelShipment',
      'initiateRTO',
      'initiateReturn',
      'validateCredentials',
      'healthCheck',
      'testConnection',
    ];
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        issues.push(`Adapter does not implement required method '${String(method)}'`);
      }
    }

    return issues;
  }
}
