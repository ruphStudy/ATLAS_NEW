import { Injectable, Logger } from '@nestjs/common';
import { ISupplierAdapterContract } from './adapter.contract';
import { AdapterCapability, IntegrationStrategy } from './adapter.types';
import { SupplierAdapterRegistry } from './supplier-adapter.registry';

export interface AdapterSelectionOptions {
  workspaceId: string;
  capability: AdapterCapability;
  strategy?: IntegrationStrategy;
  preferredProviderCode?: string;
  countryCode?: string;
  currencyCode?: string;
}

/**
 * SupplierAdapterFactoryIntegration
 *
 * Extends the selection logic from SupplierProviderFactory with adapter-infrastructure awareness.
 * Supports strategy-based selection, country/currency filtering, and preference-driven selection.
 * Integrates with the existing SupplierAdapterRegistry.
 */
@Injectable()
export class SupplierAdapterFactoryIntegration {
  private readonly logger = new Logger(SupplierAdapterFactoryIntegration.name);

  constructor(private readonly registry: SupplierAdapterRegistry) {}

  /**
   * Selects the best adapter for the given options.
   * Priority: preferred → strategy → capability → country → currency.
   */
  select(options: AdapterSelectionOptions): ISupplierAdapterContract {
    const candidates = this.rankCandidates(options);
    if (candidates.length === 0) {
      throw new Error(
        this.buildNoAdapterMessage(options),
      );
    }
    const selected = candidates[0]!;
    this.logger.debug(
      `[AdapterFactory] Selected ${selected.adapterMetadata.providerCode} ` +
        `for capability=${options.capability} strategy=${options.strategy ?? 'any'} workspace=${options.workspaceId}`,
    );
    return selected;
  }

  /**
   * Returns all adapters that can handle the request, ordered by suitability.
   */
  selectAll(options: AdapterSelectionOptions): ISupplierAdapterContract[] {
    return this.rankCandidates(options);
  }

  private rankCandidates(options: AdapterSelectionOptions): ISupplierAdapterContract[] {
    let candidates = this.registry.getCapable(options.capability);

    if (options.strategy) {
      candidates = candidates.filter((a) => a.supportsStrategy(options.strategy!));
    }

    if (options.countryCode) {
      const filtered = candidates.filter((a) => a.supportsCountryCode(options.countryCode!));
      if (filtered.length) candidates = filtered;
    }

    if (options.currencyCode) {
      const filtered = candidates.filter((a) => a.supportsCurrency(options.currencyCode!));
      if (filtered.length) candidates = filtered;
    }

    if (options.preferredProviderCode) {
      const preferred = candidates.find(
        (a) =>
          a.adapterMetadata.providerCode.toUpperCase() ===
          options.preferredProviderCode!.toUpperCase(),
      );
      if (preferred) {
        return [preferred, ...candidates.filter((a) => a !== preferred)];
      }
    }

    return candidates;
  }

  private buildNoAdapterMessage(options: AdapterSelectionOptions): string {
    const parts = [
      `No adapter supports capability='${options.capability}'`,
      options.strategy ? `strategy='${options.strategy}'` : null,
      options.countryCode ? `country='${options.countryCode}'` : null,
      options.currencyCode ? `currency='${options.currencyCode}'` : null,
    ].filter(Boolean);
    return parts.join(' ') + `. Registered: [${this.registry.registeredCodes().join(', ')}]`;
  }
}
