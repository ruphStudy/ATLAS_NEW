import { Injectable, Logger } from '@nestjs/common';
import { MarketplaceProviderRegistry } from '../../marketplace-provider/registry/marketplace-provider.registry';
import { MarketplaceProviderConfigManager } from '../../marketplace-provider-config/marketplace-provider-config.manager';
import { MarketplaceProviderCredentialsManager } from '../../marketplace-provider-credentials/marketplace-provider-credentials.manager';
import { MarketplaceProviderFactoryErrorNormalizer, ProviderFactoryException } from '../errors/marketplace-provider-factory.error-normalizer';
import { MarketplaceProviderFactoryMetrics } from '../metrics/marketplace-provider-factory.metrics';
import { ResolvedProviderDependencies, ProviderFactoryRequest } from '../interfaces';
import { MP_FACTORY_ERROR_CODES } from '../constants';

/**
 * Resolves the three dependencies required to build a provider instance:
 * 1. Registered adapter (from registry)
 * 2. Effective configuration (from config manager — global → workspace → account)
 * 3. Active credential (from credentials manager)
 */
@Injectable()
export class MarketplaceProviderDependencyResolver {
  private readonly logger = new Logger(MarketplaceProviderDependencyResolver.name);

  constructor(
    private readonly registry: MarketplaceProviderRegistry,
    private readonly configManager: MarketplaceProviderConfigManager,
    private readonly credentialsManager: MarketplaceProviderCredentialsManager,
    private readonly errorNormalizer: MarketplaceProviderFactoryErrorNormalizer,
    private readonly metrics: MarketplaceProviderFactoryMetrics,
  ) {}

  async resolve(
    providerKey: string,
    request: ProviderFactoryRequest,
  ): Promise<ResolvedProviderDependencies> {
    const key = providerKey.toUpperCase();

    // ── 1. Adapter ────────────────────────────────────────────
    if (!this.registry.isRegistered(key)) {
      this.metrics.recordProviderResolutionFailure(key);
      throw new ProviderFactoryException(
        MP_FACTORY_ERROR_CODES.PROVIDER_NOT_FOUND,
        `Provider '${key}' is not registered`,
        false,
      );
    }

    const adapter = this.registry.get(key);

    // ── 2. Configuration ──────────────────────────────────────
    let config = null;
    try {
      config = await this.configManager.resolve(
        key,
        request.workspaceId,
        request.accountId,
        request.marketplaceKey,
      );
    } catch (err) {
      this.logger.warn(`Config resolution failed for '${key}': ${(err as Error).message}`);
      // Config is optional — proceed without it; provider uses defaults
    }

    // ── 3. Credentials ────────────────────────────────────────
    let credential = null;
    if (adapter.metadata.requiresCredentials) {
      try {
        credential = await this.credentialsManager.resolve(
          key,
          request.workspaceId,
          request.accountId,
          request.marketplaceKey,
        );

        if (!credential) {
          this.metrics.recordCredentialResolutionFailure(key);
          throw new ProviderFactoryException(
            MP_FACTORY_ERROR_CODES.CREDENTIALS_MISSING,
            `No active credential found for provider '${key}' in workspace '${request.workspaceId}'`,
            false,
          );
        }
      } catch (err) {
        if (err instanceof ProviderFactoryException) throw err;
        this.metrics.recordCredentialResolutionFailure(key);
        throw this.errorNormalizer.wrap(err, `credentials[${key}]`);
      }
    }

    this.logger.debug(
      `Resolved dependencies for '${key}': config=${config ? `v${config.version}` : 'none'}, credential=${credential ? `v${credential.version}` : 'none'}`,
    );

    return { adapter, config, credential };
  }
}
