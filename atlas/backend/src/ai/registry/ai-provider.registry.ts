import { Injectable } from '@nestjs/common';
import {
  AiCapability,
  AiProviderEventType,
  IAiProvider,
  IAiProviderMetadata,
  IAiProviderRegistry,
} from '../interfaces';
import {
  AiProviderAlreadyRegisteredException,
  AiProviderNotFoundException,
} from '../exceptions/ai-provider.exceptions';
import { AiProviderEventEmitter } from '../events/ai-provider-event.emitter';

/**
 * AiProviderRegistry
 *
 * In-memory registry of concrete `IAiProvider` implementations, keyed by
 * provider key. Mirrors the shape of `AdapterRegistry`
 * (marketplace-adapter module) — registration is performed by whichever
 * module supplies a concrete provider; this foundation module never
 * registers one itself.
 */
@Injectable()
export class AiProviderRegistry implements IAiProviderRegistry {
  private readonly providers = new Map<string, IAiProvider>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {}

  register(providerKey: string, provider: IAiProvider): void {
    if (this.providers.has(providerKey)) {
      throw new AiProviderAlreadyRegisteredException(providerKey);
    }

    this.providers.set(providerKey, provider);

    this.eventEmitter.emit({
      type: AiProviderEventType.PROVIDER_REGISTERED,
      providerKey,
      occurredAt: new Date(),
    });
  }

  unregister(providerKey: string): void {
    if (this.providers.delete(providerKey)) {
      this.eventEmitter.emit({
        type: AiProviderEventType.PROVIDER_UNREGISTERED,
        providerKey,
        occurredAt: new Date(),
      });
    }
  }

  get(providerKey: string): IAiProvider {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new AiProviderNotFoundException(providerKey);
    }
    return provider;
  }

  has(providerKey: string): boolean {
    return this.providers.has(providerKey);
  }

  list(): IAiProviderMetadata[] {
    return Array.from(this.providers.values()).map((provider) => provider.getMetadata());
  }

  listByCapability(capability: AiCapability): IAiProviderMetadata[] {
    return this.list().filter((metadata) => metadata.capabilities.includes(capability));
  }

  clear(): void {
    this.providers.clear();
  }
}
