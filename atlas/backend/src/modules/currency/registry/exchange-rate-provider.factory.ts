import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ExchangeRateProviderRegistry } from './exchange-rate-provider.registry';
import { CurrencyRepository } from '../repository/currency.repository';
import { IExchangeRateProviderConfig, ProviderRateResolutionResult } from '../interfaces';

/**
 * ExchangeRateProviderFactory
 *
 * Selects and calls exchange-rate providers by configured priority, with
 * automatic fallback to the next provider on failure — mirrors
 * `MarketplaceProviderFactory`'s priority/fallback selection. No provider
 * is ever hardcoded: which providers exist comes entirely from
 * `ExchangeRateProviderRegistry`, and their order comes entirely from
 * `ExchangeRateProviderConfig` rows (workspace-scoped configs win over the
 * global default for the same provider).
 */
@Injectable()
export class ExchangeRateProviderFactory {
  private readonly logger = new Logger(ExchangeRateProviderFactory.name);

  constructor(
    private readonly registry: ExchangeRateProviderRegistry,
    private readonly repository: CurrencyRepository,
  ) {}

  async fetchWithFallback(
    baseCurrency: string,
    quoteCurrency: string,
    workspaceId?: string | null,
  ): Promise<ProviderRateResolutionResult> {
    const orderedKeys = await this.resolveProviderOrder(workspaceId);
    const attempted: string[] = [];
    let lastError: Error | undefined;

    for (const providerKey of orderedKeys) {
      if (!this.registry.isRegistered(providerKey)) continue;
      attempted.push(providerKey);
      try {
        const quote = await this.registry.get(providerKey).fetchRate(baseCurrency, quoteCurrency);
        return { quote, providerKey, attempted };
      } catch (err) {
        lastError = err as Error;
        this.logger.warn(
          `Exchange-rate provider '${providerKey}' failed for '${baseCurrency}'→'${quoteCurrency}': ${lastError.message}`,
        );
      }
    }

    throw new NotFoundException(
      `No exchange-rate provider could resolve '${baseCurrency}' → '${quoteCurrency}' (tried: ${attempted.join(', ') || 'none registered'})${lastError ? `; last error: ${lastError.message}` : ''}`,
    );
  }

  /** Merges global (workspaceId=null) and workspace-scoped priority configs — a workspace-scoped entry for a provider overrides the global one for that same provider. */
  private async resolveProviderOrder(workspaceId?: string | null): Promise<string[]> {
    const configs = (await this.repository.findProviderConfigs(workspaceId)) as unknown as IExchangeRateProviderConfig[];

    const byProvider = new Map<string, IExchangeRateProviderConfig>();
    for (const cfg of configs) {
      const existing = byProvider.get(cfg.providerKey.toUpperCase());
      if (!existing || cfg.workspaceId) {
        byProvider.set(cfg.providerKey.toUpperCase(), cfg);
      }
    }

    const configured = [...byProvider.values()]
      .filter((c) => c.isEnabled)
      .sort((a, b) => a.priority - b.priority)
      .map((c) => c.providerKey.toUpperCase());

    // Any registered provider without an explicit config still gets a chance, at default priority, after the configured ones.
    const unconfigured = this.registry
      .getAll()
      .map((a) => a.providerKey.toUpperCase())
      .filter((key) => !byProvider.has(key));

    return [...configured, ...unconfigured];
  }
}
