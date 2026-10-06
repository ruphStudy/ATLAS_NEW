import { Injectable } from '@nestjs/common';
import { CountryService } from '@modules/country/country.service';
import { CurrencyRegistry } from '@modules/currency/registry/currency.registry';
import { SupplierProviderRegistry } from '@modules/supplier-provider/registry/supplier-provider.registry';
import { SupplierAdapterRegistry } from '@modules/supplier-provider/adapters/supplier-adapter.registry';
import { ISupplierAdapterContract } from '@modules/supplier-provider/adapters/adapter.contract';
import {
  AdapterCompatibilityStatus,
  ExpansionValidationIssueType,
  IAdapterCompatibilityResult,
  IExpansionValidationResult,
} from '../interfaces';

export interface ExpansionCandidate {
  providerCode: string;
  countryCodes: string[];
  currencyCodes: string[];
}

/**
 * SupplierProviderExpansionValidator
 *
 * Validates an expansion's cross-module references (country/currency)
 * against their owning services, and structurally validates a
 * registered adapter against the `ISupplierAdapterContract` contract —
 * a runtime check that matters precisely because adapters register
 * themselves dynamically at module-init time, outside compile-time-
 * checked code paths. Never re-implements the foundation registry,
 * adapter registry, factory, or health monitor it reads from.
 */
@Injectable()
export class SupplierProviderExpansionValidator {
  constructor(
    private readonly countryService: CountryService,
    private readonly currencyRegistry: CurrencyRegistry,
    private readonly supplierProviderRegistry: SupplierProviderRegistry,
    private readonly supplierAdapterRegistry: SupplierAdapterRegistry,
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

    if (!this.supplierAdapterRegistry.isRegistered(candidate.providerCode)) {
      warnings.push(`Provider '${candidate.providerCode}' is not yet registered in the Supplier Provider Foundation — this expansion can stay DRAFT until it is`);
    }

    return { valid: issues.length === 0, issues, warnings };
  }

  /**
   * Structurally validates the registered adapter for `providerCode` against
   * the `ISupplierAdapterContract` contract — required metadata fields,
   * required capability/strategy declarations, and every required method
   * being an actual function. Also confirms the same provider is registered
   * in the foundation `SupplierProviderRegistry`, since both registries are
   * expected to hold the same adapter instance. This is a runtime duck-type
   * check (not merely relying on TypeScript's compile-time typing) precisely
   * because adapters register themselves dynamically.
   */
  async validateAdapterCompatibility(providerCode: string): Promise<IAdapterCompatibilityResult> {
    const checkedAt = new Date();

    if (!this.supplierAdapterRegistry.isRegistered(providerCode)) {
      return {
        providerCode,
        status: AdapterCompatibilityStatus.INCOMPATIBLE,
        issues: [`No adapter is registered for provider '${providerCode}' in the Supplier Adapter Registry`],
        checkedAt,
      };
    }

    const adapter = this.supplierAdapterRegistry.get(providerCode);
    const issues = this.checkAdapterShape(adapter);

    if (!this.supplierProviderRegistry.isRegistered(providerCode)) {
      issues.push(`Provider '${providerCode}' is registered in the Supplier Adapter Registry but not in the foundation Supplier Provider Registry`);
    }

    return {
      providerCode,
      status: issues.length === 0 ? AdapterCompatibilityStatus.COMPATIBLE : AdapterCompatibilityStatus.INCOMPATIBLE,
      issues,
      checkedAt,
    };
  }

  private checkAdapterShape(adapter: ISupplierAdapterContract): string[] {
    const issues: string[] = [];
    const metadata = adapter.adapterMetadata;

    if (!metadata || typeof metadata !== 'object') {
      issues.push('Adapter is missing required `adapterMetadata`');
      return issues;
    }

    if (!metadata.providerCode) issues.push('adapterMetadata.providerCode is required');
    if (!metadata.displayName) issues.push('adapterMetadata.displayName is required');
    if (!metadata.version) issues.push('adapterMetadata.version is required');
    if (!Array.isArray(metadata.capabilities) || metadata.capabilities.length === 0) {
      issues.push('adapterMetadata.capabilities must declare at least one capability');
    }
    if (!Array.isArray(metadata.integrationStrategies) || metadata.integrationStrategies.length === 0) {
      issues.push('adapterMetadata.integrationStrategies must declare at least one strategy');
    }
    if (!Array.isArray(metadata.supportedCountries)) issues.push('adapterMetadata.supportedCountries must be an array');
    if (!Array.isArray(metadata.supportedCurrencies)) issues.push('adapterMetadata.supportedCurrencies must be an array');

    const requiredMethods: Array<keyof ISupplierAdapterContract> = [
      'supportsAdapterCapability',
      'supportsStrategy',
      'supportsCountryCode',
      'supportsCurrency',
      'checkHealth',
      'testConnection',
      'buildRequestContext',
      'recordMetric',
      'recordAuditEvent',
      'normalizePagination',
      'buildResponseMetadata',
      'buildExternalReference',
      'mapError',
    ];
    for (const method of requiredMethods) {
      if (typeof adapter[method] !== 'function') {
        issues.push(`Adapter does not implement required method '${String(method)}'`);
      }
    }

    return issues;
  }
}
