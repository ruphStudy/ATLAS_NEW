import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { IExchangeRateProviderAdapter } from '../interfaces';

/**
 * ExchangeRateProviderRegistry
 *
 * Central in-memory registry for `IExchangeRateProviderAdapter` instances.
 * No concrete provider (no third-party FX API integration) is registered
 * here — this module only exposes the registration point. Concrete
 * adapters register themselves at boot from their own module, mirroring
 * `MarketplaceProviderRegistry`.
 */
@Injectable()
export class ExchangeRateProviderRegistry {
  private readonly logger = new Logger(ExchangeRateProviderRegistry.name);
  private readonly adapters = new Map<string, IExchangeRateProviderAdapter>();

  register(adapter: IExchangeRateProviderAdapter): void {
    this.adapters.set(adapter.providerKey.toUpperCase(), adapter);
    this.logger.log(`Registered exchange-rate provider: ${adapter.providerKey.toUpperCase()}`);
  }

  get(providerKey: string): IExchangeRateProviderAdapter {
    const adapter = this.adapters.get(providerKey.toUpperCase());
    if (!adapter) {
      throw new NotFoundException(`Exchange-rate provider '${providerKey}' is not registered`);
    }
    return adapter;
  }

  isRegistered(providerKey: string): boolean {
    return this.adapters.has(providerKey.toUpperCase());
  }

  getAll(): IExchangeRateProviderAdapter[] {
    return [...this.adapters.values()];
  }
}
