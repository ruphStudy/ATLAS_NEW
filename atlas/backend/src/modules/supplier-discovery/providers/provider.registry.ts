import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { SupplierSourceProvider } from '../interfaces';
import type { ISupplierProvider } from '../interfaces';

/**
 * SupplierProviderRegistry
 *
 * Central registry for all supplier discovery providers.
 * Adding a new provider (Flipkart, Made-in-China, etc.) requires only:
 *   1. Implementing ISupplierProvider
 *   2. Injecting it into this registry via the module factory
 *
 * Architecture: Open/Closed Principle.
 */
@Injectable()
export class SupplierProviderRegistry {
  private readonly logger = new Logger(SupplierProviderRegistry.name);
  private readonly providers = new Map<SupplierSourceProvider, ISupplierProvider>();

  constructor(providers: ISupplierProvider[]) {
    for (const provider of providers) {
      this.register(provider);
    }
  }

  register(provider: ISupplierProvider): void {
    this.providers.set(provider.provider, provider);
    this.logger.log(`Registered supplier provider: ${provider.provider}`);
  }

  get(providerCode: string): ISupplierProvider {
    const key = providerCode.toUpperCase() as SupplierSourceProvider;
    const provider = this.providers.get(key);

    if (!provider) {
      const supported = this.getSupportedProviders().join(', ');
      throw new BadRequestException(
        `Supplier provider '${providerCode}' is not supported. Supported: ${supported}`,
      );
    }

    return provider;
  }

  isSupported(providerCode: string): boolean {
    return this.providers.has(providerCode.toUpperCase() as SupplierSourceProvider);
  }

  getSupportedProviders(): string[] {
    return Array.from(this.providers.keys());
  }
}
