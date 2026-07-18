import { Injectable, Logger } from '@nestjs/common';
import {
  IMarketplaceProviderAdapter,
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderResolveOptions,
  WorkspaceMarketplaceProviderConfig,
} from '../interfaces';
import { MarketplaceProviderRegistry } from './marketplace-provider.registry';
import { MarketplaceProviderFactory } from './marketplace-provider.factory';

export interface ResolvedProvider {
  adapter: IMarketplaceProviderAdapter;
  accountId?: string | null;
  config?: WorkspaceMarketplaceProviderConfig | null;
}

/**
 * Multi-criteria marketplace provider resolver.
 * Resolves providers by workspace, marketplace, account, country, region, and capability.
 * Supports failover when multiple providers are available.
 */
@Injectable()
export class MarketplaceProviderResolver {
  private readonly logger = new Logger(MarketplaceProviderResolver.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly factory: MarketplaceProviderFactory,
  ) {}

  /**
   * Resolves a single provider for the given options.
   * Throws if no matching provider is found.
   */
  resolve(options: MarketplaceProviderResolveOptions): ResolvedProvider {
    const adapter = this.factory.select(options);
    const config = this.findConfig(adapter.metadata.providerKey, options.accountId, options.configs);

    this.logger.debug(
      `Resolved provider '${adapter.metadata.providerKey}' for workspace '${options.workspaceId}'`,
    );

    return { adapter, accountId: options.accountId, config };
  }

  /**
   * Resolves all matching providers ordered by priority.
   * Used for bulk operations, failover, and comparison.
   */
  resolveAll(options: MarketplaceProviderResolveOptions): ResolvedProvider[] {
    const adapters = this.factory.selectAll(options);
    return adapters.map((adapter) => ({
      adapter,
      accountId: options.accountId,
      config: this.findConfig(adapter.metadata.providerKey, options.accountId, options.configs),
    }));
  }

  /**
   * Resolves the best provider for a given marketplace key and capability.
   */
  resolveForMarketplace(
    workspaceId: string,
    marketplaceKey: MarketplaceKey,
    capability: MarketplaceCapability,
    configs?: WorkspaceMarketplaceProviderConfig[],
  ): ResolvedProvider {
    return this.resolve({ workspaceId, marketplaceKey, capability, configs });
  }

  /**
   * Returns whether any registered provider supports the given capability.
   */
  hasCapable(capability: MarketplaceCapability): boolean {
    return this.registry.getCapable(capability).length > 0;
  }

  /**
   * Lists all providers that support a given capability.
   */
  listCapable(capability: MarketplaceCapability): IMarketplaceProviderAdapter[] {
    return this.registry.getCapable(capability);
  }

  // ── Internals ────────────────────────────────────────────────

  private findConfig(
    providerKey: string,
    accountId: string | undefined,
    configs: WorkspaceMarketplaceProviderConfig[] | undefined,
  ): WorkspaceMarketplaceProviderConfig | null {
    if (!configs?.length) return null;
    return (
      configs.find(
        (c) =>
          c.providerKey.toUpperCase() === providerKey.toUpperCase() &&
          (!accountId || c.accountId === accountId) &&
          !c.deletedAt,
      ) ?? null
    );
  }
}
