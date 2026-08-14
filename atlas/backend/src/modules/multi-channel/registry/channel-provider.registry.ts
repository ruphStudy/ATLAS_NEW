import { Injectable, Logger } from '@nestjs/common';
import { ChannelType, IChannelProviderAdapter } from '../interfaces';

/**
 * ChannelProviderRegistry
 *
 * An in-memory registry for NON-marketplace channel-type adapters (D2C
 * stores, B2B portals, retail/POS, social commerce). MARKETPLACE-type
 * channels never use this — they resolve through the existing
 * `MarketplaceProviderRegistry`/`MarketplaceProviderFactoryService`
 * unchanged. Mirrors that registry's register/get/discover shape at a
 * smaller scale, so a future adapter has one obvious, provider-independent
 * place to register itself without the core framework knowing anything
 * about it.
 */
@Injectable()
export class ChannelProviderRegistry {
  private readonly logger = new Logger(ChannelProviderRegistry.name);
  private readonly adapters = new Map<string, IChannelProviderAdapter>();

  register(adapter: IChannelProviderAdapter): void {
    this.adapters.set(adapter.metadata.providerKey, adapter);
    this.logger.log(`Registered channel provider '${adapter.metadata.providerKey}'`);
  }

  get(providerKey: string): IChannelProviderAdapter | undefined {
    return this.adapters.get(providerKey);
  }

  getAll(): IChannelProviderAdapter[] {
    return [...this.adapters.values()];
  }

  isRegistered(providerKey: string): boolean {
    return this.adapters.has(providerKey);
  }

  remove(providerKey: string): void {
    this.adapters.delete(providerKey);
  }

  getCapable(capability: string): IChannelProviderAdapter[] {
    return this.getAll().filter((adapter) => adapter.supportsCapability(capability));
  }

  getForChannelType(channelType: ChannelType): IChannelProviderAdapter[] {
    return this.getAll().filter((adapter) => adapter.supportsChannelType(channelType));
  }
}
