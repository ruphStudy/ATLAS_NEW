import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { CurrencyRegistry } from '@modules/currency/registry/currency.registry';
import { LocalizationService } from '@modules/localization/localization.service';
import { MarketplaceProviderRegistry } from '@modules/marketplace-provider/registry/marketplace-provider.registry';
import { IMarketplaceProviderAdapter } from '@modules/marketplace-provider/interfaces';
import {
  AdapterCompatibilityStatus,
  ExpansionValidationIssueType,
  IAdapterCompatibilityResult,
  IExpansionValidationResult,
} from '../interfaces';

export interface ExpansionCandidate {
  providerKey: string;
  countryCodes: string[];
  currencyCodes: string[];
  localeCodes: string[];
}

/**
 * MarketplaceExpansionValidator
 *
 * Validates an expansion's cross-module references (country/currency/
 * locale) against their owning services, and structurally validates a
 * registered adapter against the `IMarketplaceProviderAdapter` contract —
 * a runtime check that matters precisely because adapters can be
 * registered dynamically, outside compile-time-checked code paths.
 * Never re-implements the registry, factory, capability matrix or health
 * monitor it reads from.
 */
@Injectable()
export class MarketplaceExpansionValidator {
  constructor(
    private readonly countryService: CountryService,
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly localizationService: LocalizationService,
    private readonly marketplaceProviderRegistry: MarketplaceProviderRegistry,
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

    for (const currencyCode of candidate.currencyCodes) {
      if (!this.currencyRegistry.get(currencyCode)) {
        issues.push({ type: ExpansionValidationIssueType.UNKNOWN_CURRENCY, message: `Currency '${currencyCode}' is not registered` });
      }
    }

    for (const localeCode of candidate.localeCodes) {
      try {
        await this.localizationService.getLocale(localeCode);
      } catch {
        issues.push({ type: ExpansionValidationIssueType.UNKNOWN_LOCALE, message: `Locale '${localeCode}' is not registered` });
      }
    }

    if (!this.marketplaceProviderRegistry.isRegistered(candidate.providerKey)) {
      warnings.push(`Provider '${candidate.providerKey}' is not yet registered in the Multi-Marketplace Framework — this expansion can stay DRAFT until it is`);
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /**
   * Structurally validates the registered adapter for `providerKey` against
   * the `IMarketplaceProviderAdapter` contract — required metadata fields,
   * required capability declarations, and every required method being an
   * actual function. This is a runtime duck-type check (not merely relying
   * on TypeScript's compile-time typing) precisely because adapters can be
   * registered dynamically.
   */
  async validateAdapterCompatibility(providerKey: string): Promise<IAdapterCompatibilityResult> {
    const checkedAt = new Date();

    if (!this.marketplaceProviderRegistry.isRegistered(providerKey)) {
      return {
        providerKey,
        status: AdapterCompatibilityStatus.INCOMPATIBLE,
        issues: [`No adapter is registered for provider '${providerKey}'`],
        checkedAt,
      };
    }

    const adapter = this.marketplaceProviderRegistry.get(providerKey);
    const issues = this.checkAdapterShape(adapter);

    return {
      providerKey,
      status: issues.length === 0 ? AdapterCompatibilityStatus.COMPATIBLE : AdapterCompatibilityStatus.INCOMPATIBLE,
      issues,
      checkedAt,
    };
  }

  private checkAdapterShape(adapter: IMarketplaceProviderAdapter): string[] {
    const issues: string[] = [];
    const metadata = adapter.metadata;

    if (!metadata || typeof metadata !== 'object') {
      issues.push('Adapter is missing required `metadata`');
      return issues;
    }

    if (!metadata.providerKey) issues.push('metadata.providerKey is required');
    if (!metadata.providerName) issues.push('metadata.providerName is required');
    if (!metadata.version) issues.push('metadata.version is required');
    if (!Array.isArray(metadata.supportedCapabilities) || metadata.supportedCapabilities.length === 0) {
      issues.push('metadata.supportedCapabilities must declare at least one capability');
    }
    if (!Array.isArray(metadata.supportedCountries)) issues.push('metadata.supportedCountries must be an array');
    if (!Array.isArray(metadata.supportedCurrencies)) issues.push('metadata.supportedCurrencies must be an array');

    const requiredMethods: Array<keyof IMarketplaceProviderAdapter> = [
      'supportsCapability',
      'supportsCountry',
      'supportsRegion',
      'supportsMarketplace',
      'validateCredentials',
      'testConnection',
      'healthCheck',
    ];
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        issues.push(`Adapter does not implement required method '${String(method)}'`);
      }
    }

    return issues;
  }
}
