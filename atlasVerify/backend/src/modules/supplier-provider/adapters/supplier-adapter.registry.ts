import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ISupplierAdapterContract } from './adapter.contract';
import { AdapterCapability, AdapterMetadata, IntegrationStrategy } from './adapter.types';

/**
 * SupplierAdapterRegistry
 *
 * Extended registry for adapter infrastructure.
 * Wraps the existing SupplierProviderRegistry and adds adapter-infrastructure awareness.
 * Does NOT replace the foundation registry — integrates alongside it.
 */
@Injectable()
export class SupplierAdapterRegistry {
  private readonly logger = new Logger(SupplierAdapterRegistry.name);
  private readonly adapters = new Map<string, ISupplierAdapterContract>();

  /**
   * Register a concrete adapter.
   * Throws ConflictException if a provider with the same code is already registered.
   */
  register(adapter: ISupplierAdapterContract): void {
    const code = adapter.adapterMetadata.providerCode.toUpperCase();
    if (this.adapters.has(code)) {
      throw new ConflictException(
        `Adapter for provider '${code}' is already registered. Duplicate registration is not allowed.`,
      );
    }
    this.adapters.set(code, adapter);
    this.logger.log(
      `Registered adapter: ${code} ` +
        `v${adapter.adapterMetadata.version.major}.${adapter.adapterMetadata.version.minor}.${adapter.adapterMetadata.version.patch} ` +
        `strategies=[${adapter.adapterMetadata.integrationStrategies.join(',')}] ` +
        `capabilities=[${adapter.adapterMetadata.capabilities.join(',')}]`,
    );
  }

  /**
   * Resolve an adapter by provider code.
   */
  get(providerCode: string): ISupplierAdapterContract {
    const code = providerCode.toUpperCase();
    const adapter = this.adapters.get(code);
    if (!adapter) {
      throw new NotFoundException(
        `No adapter registered for provider '${providerCode}'. Registered: [${this.registeredCodes().join(', ')}]`,
      );
    }
    return adapter;
  }

  /**
   * Returns all registered adapters.
   */
  getAll(): ISupplierAdapterContract[] {
    return Array.from(this.adapters.values());
  }

  isRegistered(providerCode: string): boolean {
    return this.adapters.has(providerCode.toUpperCase());
  }

  registeredCodes(): string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Returns adapters supporting the given capability.
   */
  getCapable(capability: AdapterCapability): ISupplierAdapterContract[] {
    return Array.from(this.adapters.values()).filter((a) =>
      a.supportsAdapterCapability(capability),
    );
  }

  /**
   * Returns adapters supporting the given integration strategy.
   */
  getByStrategy(strategy: IntegrationStrategy): ISupplierAdapterContract[] {
    return Array.from(this.adapters.values()).filter((a) => a.supportsStrategy(strategy));
  }

  /**
   * Returns adapter metadata for all registered adapters.
   */
  listMetadata(): AdapterMetadata[] {
    return Array.from(this.adapters.values()).map((a) => a.adapterMetadata);
  }
}
