import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProviderAdapter } from '../interfaces';

/**
 * PaymentProviderRegistry — an in-memory `Map` of adapter instances keyed
 * by uppercased `providerKey`, the same shape as `MarketplaceProviderRegistry`.
 * Adapters register themselves at module init (see `PaymentProviderModule`'s
 * `onModuleInit`); the registry itself carries no provider-specific logic.
 */
@Injectable()
export class PaymentProviderRegistry {
  private readonly logger = new Logger(PaymentProviderRegistry.name);
  private readonly adapters = new Map<string, IPaymentProviderAdapter>();

  register(adapter: IPaymentProviderAdapter): void {
    const key = adapter.metadata.providerKey.toUpperCase();
    if (this.adapters.has(key)) {
      this.logger.warn(`Overwriting existing payment provider adapter for '${key}'`);
    }
    this.adapters.set(key, adapter);
  }

  get(providerKey: string): IPaymentProviderAdapter | undefined {
    return this.adapters.get(providerKey.toUpperCase());
  }

  has(providerKey: string): boolean {
    return this.adapters.has(providerKey.toUpperCase());
  }

  getAll(): IPaymentProviderAdapter[] {
    return [...this.adapters.values()];
  }
}
