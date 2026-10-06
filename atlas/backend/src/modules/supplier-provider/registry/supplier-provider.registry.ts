import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  ISupplierProviderAdapter,
  ISupplierProviderRegistry,
  ProviderCapability,
  SupplierProviderCode,
} from '../interfaces';

/**
 * Central registry for all ISupplierProviderAdapter instances.
 * Business modules use this — never referencing concrete adapter classes.
 */
@Injectable()
export class SupplierProviderRegistry implements ISupplierProviderRegistry {
  private readonly logger = new Logger(SupplierProviderRegistry.name);
  private readonly adapters = new Map<SupplierProviderCode, ISupplierProviderAdapter>();

  constructor() {}

  register(adapter: ISupplierProviderAdapter): void {
    this.adapters.set(adapter.metadata.code, adapter);
    this.logger.log(
      `Registered provider: ${adapter.metadata.code} v${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`,
    );
  }

  get(providerCode: string): ISupplierProviderAdapter {
    const key = providerCode.toUpperCase() as SupplierProviderCode;
    const adapter = this.adapters.get(key);
    if (!adapter) {
      throw new NotFoundException(
        `Supplier provider '${providerCode}' is not registered. Supported: ${this.getSupportedCodes().join(', ')}`,
      );
    }
    return adapter;
  }

  getAll(): ISupplierProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  isRegistered(providerCode: string): boolean {
    return this.adapters.has(providerCode.toUpperCase() as SupplierProviderCode);
  }

  getSupportedCodes(): SupplierProviderCode[] {
    return Array.from(this.adapters.keys());
  }

  getCapable(capability: ProviderCapability): ISupplierProviderAdapter[] {
    return Array.from(this.adapters.values()).filter((a) =>
      a.supportsCapability(capability),
    );
  }
}
