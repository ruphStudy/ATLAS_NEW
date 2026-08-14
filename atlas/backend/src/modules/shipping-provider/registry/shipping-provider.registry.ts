import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  IShippingProviderAdapter,
  IShippingProviderRegistry,
  ShippingCapability,
  ShippingProviderStatus,
} from '../interfaces';

interface RegistryEntry {
  adapter: IShippingProviderAdapter;
  status: ShippingProviderStatus;
  registeredAt: Date;
}

/**
 * Central in-memory registry for all IShippingProviderAdapter instances.
 * Business modules (Dispatch, Shipment Tracking) must only interact with
 * couriers through this registry — no courier-specific logic lives here.
 */
@Injectable()
export class ShippingProviderRegistry implements IShippingProviderRegistry {
  private readonly logger = new Logger(ShippingProviderRegistry.name);
  private readonly entries = new Map<string, RegistryEntry>();

  register(adapter: IShippingProviderAdapter): void {
    const key = adapter.metadata.providerKey.toUpperCase();
    this.entries.set(key, {
      adapter,
      status: ShippingProviderStatus.ACTIVE,
      registeredAt: new Date(),
    });
    this.logger.log(
      `Registered shipping provider: ${key} v${adapter.metadata.version.major}.${adapter.metadata.version.minor}.${adapter.metadata.version.patch}`,
    );
  }

  enable(providerKey: string): void {
    const entry = this.requireEntry(providerKey);
    entry.status = ShippingProviderStatus.ACTIVE;
    this.logger.log(`Enabled shipping provider: ${providerKey.toUpperCase()}`);
  }

  disable(providerKey: string): void {
    const entry = this.requireEntry(providerKey);
    entry.status = ShippingProviderStatus.INACTIVE;
    this.logger.log(`Disabled shipping provider: ${providerKey.toUpperCase()}`);
  }

  remove(providerKey: string): void {
    const key = providerKey.toUpperCase();
    if (!this.entries.has(key)) {
      throw new NotFoundException(`Shipping provider '${providerKey}' is not registered`);
    }
    this.entries.delete(key);
    this.logger.log(`Removed shipping provider: ${key}`);
  }

  get(providerKey: string): IShippingProviderAdapter {
    const key = providerKey.toUpperCase();
    const entry = this.entries.get(key);
    if (!entry) {
      throw new NotFoundException(
        `Shipping provider '${providerKey}' is not registered. Available: ${this.getSupportedKeys().join(', ')}`,
      );
    }
    return entry.adapter;
  }

  getAll(): IShippingProviderAdapter[] {
    return Array.from(this.entries.values()).map((e) => e.adapter);
  }

  getActive(): IShippingProviderAdapter[] {
    return Array.from(this.entries.values())
      .filter((e) => e.status === ShippingProviderStatus.ACTIVE)
      .map((e) => e.adapter);
  }

  isRegistered(providerKey: string): boolean {
    return this.entries.has(providerKey.toUpperCase());
  }

  isActive(providerKey: string): boolean {
    return this.entries.get(providerKey.toUpperCase())?.status === ShippingProviderStatus.ACTIVE;
  }

  getSupportedKeys(): string[] {
    return Array.from(this.entries.keys());
  }

  getCapable(capability: ShippingCapability): IShippingProviderAdapter[] {
    return this.getActive().filter((a) => a.supportsCapability(capability));
  }

  /** Shallow presence check performed at registration time — deeper structural/contract validation is the Expansion Framework's job. */
  validate(providerKey: string): boolean {
    const key = providerKey.toUpperCase();
    const entry = this.entries.get(key);
    if (!entry) return false;
    const { metadata } = entry.adapter;
    if (!metadata.providerKey || !metadata.displayName) return false;
    if (!metadata.capabilities?.length) {
      this.logger.warn(`Shipping provider '${key}' declares no capabilities`);
    }
    return true;
  }

  getStatus(providerKey: string): ShippingProviderStatus | null {
    return this.entries.get(providerKey.toUpperCase())?.status ?? null;
  }

  setStatus(providerKey: string, status: ShippingProviderStatus): void {
    const entry = this.requireEntry(providerKey);
    entry.status = status;
  }

  private requireEntry(providerKey: string): RegistryEntry {
    const key = providerKey.toUpperCase();
    const entry = this.entries.get(key);
    if (!entry) {
      throw new NotFoundException(`Shipping provider '${providerKey}' is not registered`);
    }
    return entry;
  }
}
