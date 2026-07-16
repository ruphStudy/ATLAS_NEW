import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { IMarketplaceAdapter } from '../interfaces';

/**
 * MarketplaceAdapterRegistry
 *
 * Central registry for all marketplace adapters.
 * New adapters (Flipkart, Walmart, Etsy, Shopify, …) are registered here
 * and immediately available to the discovery engine without code changes
 * in the service or processor.
 *
 * Architecture: Open/Closed Principle — open for extension, closed for modification.
 */
@Injectable()
export class MarketplaceAdapterRegistry {
  private readonly logger = new Logger(MarketplaceAdapterRegistry.name);
  private readonly adapters = new Map<string, IMarketplaceAdapter>();

  constructor(adapters: IMarketplaceAdapter[]) {
    for (const adapter of adapters) {
      this.register(adapter);
    }
  }

  register(adapter: IMarketplaceAdapter): void {
    const key = adapter.marketplace.toUpperCase();
    this.adapters.set(key, adapter);
    this.logger.log(`Registered marketplace adapter: ${key}`);
  }

  /**
   * Returns the adapter for a given marketplace code.
   * Normalizes codes like "AMAZON_US" → "AMAZON".
   */
  get(marketplace: string): IMarketplaceAdapter {
    const normalized = marketplace.replace(/_[A-Z]{1,5}$/, '').toUpperCase();
    const adapter = this.adapters.get(normalized);

    if (!adapter) {
      const supported = this.getSupportedMarketplaces().join(', ');
      throw new BadRequestException(
        `Marketplace '${marketplace}' is not supported. Supported: ${supported}`,
      );
    }

    return adapter;
  }

  isSupported(marketplace: string): boolean {
    const normalized = marketplace.replace(/_[A-Z]{1,5}$/, '').toUpperCase();
    return this.adapters.has(normalized);
  }

  getSupportedMarketplaces(): string[] {
    return Array.from(this.adapters.keys());
  }
}
