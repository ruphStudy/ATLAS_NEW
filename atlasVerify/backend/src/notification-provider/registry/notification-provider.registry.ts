import { Injectable } from '@nestjs/common';
import { NotificationProviderEventEmitter } from '../events/notification-provider-event.emitter';
import {
  INotificationProvider,
  INotificationProviderMetadata,
  NotificationProviderChannel,
  NotificationProviderEventType,
} from '../interfaces';
import {
  NotificationProviderAlreadyRegisteredException,
  NotificationProviderNotFoundException,
} from '../exceptions/notification-provider.exceptions';

/**
 * Live in-process registry of concrete `INotificationProvider` adapter
 * instances, mirroring src/ai/registry/ai-provider.registry.ts. Purely a
 * runtime bookkeeping map — the persisted catalog (which providers a
 * workspace has enabled, with what priority) lives in the
 * notification-provider feature module, not here.
 */
@Injectable()
export class NotificationProviderRegistry {
  private readonly providers = new Map<string, INotificationProvider>();

  constructor(private readonly eventEmitter: NotificationProviderEventEmitter) {}

  register(provider: INotificationProvider): void {
    const { providerKey } = provider.getMetadata();

    if (this.providers.has(providerKey)) {
      throw new NotificationProviderAlreadyRegisteredException(providerKey);
    }

    this.providers.set(providerKey, provider);
    this.eventEmitter.emit({
      type: NotificationProviderEventType.PROVIDER_REGISTERED,
      providerKey,
      occurredAt: new Date(),
    });
  }

  unregister(providerKey: string): void {
    if (this.providers.delete(providerKey)) {
      this.eventEmitter.emit({
        type: NotificationProviderEventType.PROVIDER_UNREGISTERED,
        providerKey,
        occurredAt: new Date(),
      });
    }
  }

  get(providerKey: string): INotificationProvider {
    const provider = this.providers.get(providerKey);
    if (!provider) {
      throw new NotificationProviderNotFoundException(providerKey);
    }
    return provider;
  }

  has(providerKey: string): boolean {
    return this.providers.has(providerKey);
  }

  list(): INotificationProviderMetadata[] {
    return Array.from(this.providers.values()).map((p) => p.getMetadata());
  }

  listByChannel(channel: NotificationProviderChannel): INotificationProviderMetadata[] {
    return this.list().filter((m) => m.channels.includes(channel));
  }

  clear(): void {
    this.providers.clear();
  }
}
