import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  IMarketplaceProviderAdapter,
  IMarketplaceProviderRegistry,
  MarketplaceCapability,
  MarketplaceKey,
  MarketplaceProviderStatus,
} from '../interfaces';

interface RegistryEntry {
  adapter: IMarketplaceProviderAdapter;
  status: MarketplaceProviderStatus;
  registeredAt: Date;
}

/**
 * Central in-memory registry for all IMarketplaceProviderAdapter instances.
 * Business modules must only interact with providers through this registry.
 * No marketplace-specific logic lives here.
 */
@Injectable()
export class MarketplaceProviderRegistry implements IMarketplaceProviderRegistry {
  private readonly logger = new Logger(MarketplaceProviderRegistry.name);
  private readonly entries = new Map<string, RegistryEntry>();

  register(adapter: IMarketplaceProviderAdapter): void {
    const key = adapter.metadata.providerKey.toUpperCase();
    this.entries.set(key, {
      adapter,
      status: MarketplaceProviderStatus.ACTIVE,
      registeredAt: new Date(),
    });
    this.logger.log(
      `Registered marketplace provider: ${key} v${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`,
    );
  }

  update(providerKey: string, adapter: IMarketplaceProviderAdapter): void {
    const key = providerKey.toUpperCase();
    const existing = this.entries.get(key);
    if (!existing) {
      throw new NotFoundException(`Provider '${providerKey}' is not registered`);
    }
    this.entries.set(key, { ...existing, adapter });
    this.logger.log(`Updated marketplace provider: ${key}`);
  }

  enable(providerKey: string): void {
    const entry = this.requireEntry(providerKey);
    entry.status = MarketplaceProviderStatus.ACTIVE;
    this.logger.log(`Enabled marketplace provider: ${providerKey.toUpperCase()}`);
  }

  disable(providerKey: string): void {
    const entry = this.requireEntry(providerKey);
    entry.status = MarketplaceProviderStatus.INACTIVE;
    this.logger.log(`Disabled marketplace provider: ${providerKey.toUpperCase()}`);
  }

  remove(providerKey: string): void {
    const key = providerKey.toUpperCase();
    if (!this.entries.has(key)) {
      throw new NotFoundException(`Provider '${providerKey}' is not registered`);
    }
    this.entries.delete(key);
    this.logger.log(`Removed marketplace provider: ${key}`);
  }

  get(providerKey: string): IMarketplaceProviderAdapter {
    const key = providerKey.toUpperCase();
    const entry = this.entries.get(key);
    if (!entry) {
      throw new NotFoundException(
        `Marketplace provider '${providerKey}' is not registered. Available: ${this.getSupportedKeys().join(', ')}`,
      );
    }
    return entry.adapter;
  }

  getAll(): IMarketplaceProviderAdapter[] {
    return Array.from(this.entries.values()).map((e) => e.adapter);
  }

  getActive(): IMarketplaceProviderAdapter[] {
    return Array.from(this.entries.values())
      .filter((e) => e.status === MarketplaceProviderStatus.ACTIVE)
      .map((e) => e.adapter);
  }

  isRegistered(providerKey: string): boolean {
    return this.entries.has(providerKey.toUpperCase());
  }

  isActive(providerKey: string): boolean {
    const entry = this.entries.get(providerKey.toUpperCase());
    return entry?.status === MarketplaceProviderStatus.ACTIVE;
  }

  getSupportedKeys(): string[] {
    return Array.from(this.entries.keys());
  }

  getCapable(capability: MarketplaceCapability): IMarketplaceProviderAdapter[] {
    return this.getActive().filter((a) => a.supportsCapability(capability));
  }

  getCapableForMarketplace(
    marketplaceKey: MarketplaceKey,
    capability?: MarketplaceCapability,
  ): IMarketplaceProviderAdapter[] {
    return this.getActive().filter(
      (a) =>
        a.supportsMarketplace(marketplaceKey) &&
        (!capability || a.supportsCapability(capability)),
    );
  }

  discover(): IMarketplaceProviderAdapter[] {
    return this.getAll();
  }

  validate(providerKey: string): boolean {
    const key = providerKey.toUpperCase();
    if (!this.entries.has(key)) return false;
    const entry = this.entries.get(key)!;
    const { metadata } = entry.adapter;
    if (!metadata.providerKey || !metadata.displayName) return false;
    if (!metadata.supportedCapabilities?.length) {
      this.logger.warn(`Provider '${key}' declares no capabilities`);
    }
    return true;
  }

  getStatus(providerKey: string): MarketplaceProviderStatus | null {
    return this.entries.get(providerKey.toUpperCase())?.status ?? null;
  }

  setStatus(providerKey: string, status: MarketplaceProviderStatus): void {
    const entry = this.requireEntry(providerKey);
    entry.status = status;
  }

  // ── Internals ────────────────────────────────────────────────

  private requireEntry(providerKey: string): RegistryEntry {
    const key = providerKey.toUpperCase();
    const entry = this.entries.get(key);
    if (!entry) {
      throw new NotFoundException(`Provider '${providerKey}' is not registered`);
    }
    return entry;
  }
}
