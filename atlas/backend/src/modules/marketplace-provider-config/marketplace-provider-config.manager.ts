import { Injectable, Logger } from '@nestjs/common';
import { IMarketplaceProviderConfig } from './interfaces';
import { MarketplaceProviderConfigService } from './marketplace-provider-config.service';
import { MarketplaceProviderConfigCache } from './cache/marketplace-provider-config.cache';

/**
 * MarketplaceProviderConfigManager
 *
 * Facade used by other modules (MarketplaceProviderManager, adapters, etc.)
 * to resolve effective configuration without dealing with cache or DB directly.
 *
 * Resolution order:
 *   1. Workspace-specific config for provider+account
 *   2. Workspace-specific config for provider (no account)
 *   3. Global config for provider
 *   4. null (caller applies defaults)
 */
@Injectable()
export class MarketplaceProviderConfigManager {
  private readonly logger = new Logger(MarketplaceProviderConfigManager.name);

  constructor(
    private readonly service: MarketplaceProviderConfigService,
    private readonly cache: MarketplaceProviderConfigCache,
  ) {}

  /**
   * Resolves the effective configuration for a provider in a given workspace.
   * Returns null if no published configuration exists.
   */
  async resolve(
    providerKey: string,
    workspaceId: string,
    accountId?: string | null,
    marketplaceKey?: string | null,
  ): Promise<IMarketplaceProviderConfig | null> {
    // 1. Workspace + account specific
    if (accountId) {
      const cfg = await this.service.resolveActiveConfig(providerKey, workspaceId, accountId, marketplaceKey);
      if (cfg) {
        this.logger.debug(`Resolved workspace+account config for '${providerKey}' ws='${workspaceId}' acct='${accountId}'`);
        return cfg;
      }
    }

    // 2. Workspace specific (no account match required)
    const wsCfg = await this.service.resolveActiveConfig(providerKey, workspaceId, null, marketplaceKey);
    if (wsCfg) {
      this.logger.debug(`Resolved workspace config for '${providerKey}' ws='${workspaceId}'`);
      return wsCfg;
    }

    // 3. Global config
    const globalCfg = await this.service.resolveActiveConfig(providerKey, null, null, marketplaceKey);
    if (globalCfg) {
      this.logger.debug(`Resolved global config for '${providerKey}'`);
      return globalCfg;
    }

    this.logger.debug(`No published config found for '${providerKey}' ws='${workspaceId}'`);
    return null;
  }

  /**
   * Invalidates the cache for a specific provider or workspace.
   */
  invalidate(providerKey?: string, workspaceId?: string): void {
    this.service.invalidateCache(providerKey, workspaceId);
  }
}
