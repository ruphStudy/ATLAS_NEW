import { Injectable, Logger } from '@nestjs/common';
import {
  IShippingProviderAdapter,
  ShippingProviderSelectionCriteria,
  WorkspaceShippingProviderConfig,
} from '../interfaces';
import { ShippingProviderRegistry } from './shipping-provider.registry';
import { SHIPPING_PROVIDER_CONSTANTS } from '../constants';

/**
 * Selects the best-available shipping provider for a capability given
 * workspace configuration and route/service criteria. Supports priority
 * ordering, enable/disable, country/region/service-level filtering, and
 * failover — never anything courier-specific.
 */
@Injectable()
export class ShippingProviderFactory {
  private readonly logger = new Logger(ShippingProviderFactory.name);

  constructor(private readonly registry: ShippingProviderRegistry) {}

  /**
   * Returns a single adapter matching the criteria.
   * If preferredProviderKey is given, registered and eligible, it wins.
   * Otherwise the highest-priority eligible adapter is returned.
   */
  select(criteria: ShippingProviderSelectionCriteria): IShippingProviderAdapter {
    const { preferredProviderKey } = criteria;

    if (preferredProviderKey && this.registry.isRegistered(preferredProviderKey)) {
      const adapter = this.registry.get(preferredProviderKey);
      if (this.matches(adapter, criteria)) {
        return adapter;
      }
    }

    const candidates = this.selectAll(criteria);
    if (candidates.length === 0) {
      throw new Error(
        `No enabled shipping provider matches capability '${criteria.capability}' for workspace '${criteria.workspaceId}'`,
      );
    }
    return candidates[0]!;
  }

  /**
   * Returns all eligible adapters, ordered by workspace priority ascending
   * (lower = higher priority). Used for failover and for cost/SLA-based
   * selection — callers rate-shop across the returned candidates via
   * `getRateQuote()` and pick the best result themselves, since cost is
   * only known after querying each provider.
   */
  selectAll(criteria: ShippingProviderSelectionCriteria): IShippingProviderAdapter[] {
    const candidates = this.registry
      .getCapable(criteria.capability)
      .filter((a) => this.isEnabled(a.metadata.providerKey, criteria.configs))
      .filter((a) => this.matches(a, criteria));

    return candidates.sort(
      (a, b) => this.getPriority(a.metadata.providerKey, criteria.configs) - this.getPriority(b.metadata.providerKey, criteria.configs),
    );
  }

  private matches(adapter: IShippingProviderAdapter, criteria: ShippingProviderSelectionCriteria): boolean {
    if (criteria.originCountry && !adapter.supportsCountry(criteria.originCountry)) return false;
    if (criteria.destinationCountry && !adapter.supportsCountry(criteria.destinationCountry)) return false;
    if (criteria.region && !adapter.supportsRegion(criteria.region)) return false;
    if (criteria.serviceLevel && !adapter.supportsServiceLevel(criteria.serviceLevel)) return false;
    return true;
  }

  private isEnabled(providerKey: string, configs?: WorkspaceShippingProviderConfig[]): boolean {
    if (!configs) return true;
    const cfg = configs.find((c) => c.providerKey.toUpperCase() === providerKey.toUpperCase());
    return cfg ? cfg.isEnabled : true;
  }

  private getPriority(providerKey: string, configs?: WorkspaceShippingProviderConfig[]): number {
    if (!configs) return SHIPPING_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
    const cfg = configs.find((c) => c.providerKey.toUpperCase() === providerKey.toUpperCase());
    return cfg ? cfg.priority : SHIPPING_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
  }
}
