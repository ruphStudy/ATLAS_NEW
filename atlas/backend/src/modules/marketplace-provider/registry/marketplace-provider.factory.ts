import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderResolveOptions,
  WorkspaceMarketplaceProviderConfig,
} from '../interfaces';
import { MarketplaceProviderRegistry } from './marketplace-provider.registry';
import { MARKETPLACE_PROVIDER_CONSTANTS } from '../constants';

/**
 * Selects the best-available marketplace provider given workspace configuration.
 * Supports priority ordering, enable/disable, failover, and multi-criteria resolution.
 */
@Injectable()
export class MarketplaceProviderFactory {
  private readonly logger = new Logger(MarketplaceProviderFactory.name);

  constructor(private readonly registry: MarketplaceProviderRegistry) {}

  /**
   * Returns a single adapter matching the given resolution options.
   * Preferred provider key wins if registered and capable.
   * Falls back to highest-priority enabled adapter otherwise.
   */
  select(options: MarketplaceProviderResolveOptions): IMarketplaceProviderAdapter {
    const { capability, preferredProviderKey, configs, country, region, marketplaceKey } = options;

    // Try preferred provider first
    if (preferredProviderKey && this.registry.isRegistered(preferredProviderKey)) {
      const adapter = this.registry.get(preferredProviderKey);
      if (this.matchesOptions(adapter, options)) {
        return adapter;
      }
    }

    const candidates = this.getCandidates(options, configs);

    if (candidates.length === 0) {
      const ctx = [
        capability ? `capability=${capability}` : null,
        marketplaceKey ? `marketplace=${marketplaceKey}` : null,
        country ? `country=${country}` : null,
        region ? `region=${region}` : null,
      ]
        .filter(Boolean)
        .join(', ');
      throw new Error(
        `No enabled marketplace provider available for workspace '${options.workspaceId}' [${ctx}]`,
      );
    }

    const selected = candidates[0]!;
    this.logger.debug(
      `Selected provider ${selected.metadata.providerKey} for workspace ${options.workspaceId}`,
    );
    return selected;
  }

  /**
   * Returns all matching adapters ordered by priority.
   * Used for failover scenarios.
   */
  selectAll(options: MarketplaceProviderResolveOptions): IMarketplaceProviderAdapter[] {
    return this.getCandidates(options, options.configs);
  }

  // ── Internals ────────────────────────────────────────────────

  private getCandidates(
    options: MarketplaceProviderResolveOptions,
    configs: WorkspaceMarketplaceProviderConfig[] | undefined,
  ): IMarketplaceProviderAdapter[] {
    const candidates = this.registry
      .getActive()
      .filter((a) => this.matchesOptions(a, options))
      .filter((a) => this.isEnabled(a.metadata.providerKey, configs));

    return candidates.sort((a, b) => {
      const pa = this.getPriority(a.metadata.providerKey, configs);
      const pb = this.getPriority(b.metadata.providerKey, configs);
      return pa - pb;
    });
  }

  private matchesOptions(
    adapter: IMarketplaceProviderAdapter,
    options: MarketplaceProviderResolveOptions,
  ): boolean {
    const { capability, marketplaceKey, country, region } = options;
    if (capability && !adapter.supportsCapability(capability)) return false;
    if (marketplaceKey && !adapter.supportsMarketplace(marketplaceKey)) return false;
    if (country && !adapter.supportsCountry(country)) return false;
    if (region && !adapter.supportsRegion(region)) return false;
    return true;
  }

  private isEnabled(
    providerKey: string,
    configs: WorkspaceMarketplaceProviderConfig[] | undefined,
  ): boolean {
    if (!configs?.length) return true;
    const cfg = configs.find(
      (c) => c.providerKey.toUpperCase() === providerKey.toUpperCase() && !c.deletedAt,
    );
    return cfg?.isEnabled ?? true;
  }

  private getPriority(
    providerKey: string,
    configs: WorkspaceMarketplaceProviderConfig[] | undefined,
  ): number {
    if (!configs?.length) return MARKETPLACE_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
    const cfg = configs.find(
      (c) => c.providerKey.toUpperCase() === providerKey.toUpperCase() && !c.deletedAt,
    );
    return cfg?.priority ?? MARKETPLACE_PROVIDER_CONSTANTS.DEFAULT_PRIORITY;
  }
}
