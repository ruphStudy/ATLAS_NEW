import { Injectable } from '@nestjs/common';
import { NotificationProviderEventEmitter } from '../events/notification-provider-event.emitter';
import {
  INotificationProvider,
  INotificationProviderHealth,
  NotificationProviderHealthStatus,
  NotificationProviderLifecycleStatus,
  NotificationProviderEventType,
} from '../interfaces';

/**
 * Mirrors src/ai/health/ai-provider-health.service.ts. Does zero network
 * calls itself — a health check is entirely delegated to the concrete
 * adapter's own `getHealth()`; this service only records the result and
 * diffs it against the last known status to detect changes worth an event.
 */
@Injectable()
export class NotificationProviderHealthService {
  private readonly lastKnown = new Map<string, INotificationProviderHealth>();

  constructor(private readonly eventEmitter: NotificationProviderEventEmitter) {}

  async checkHealth(provider: INotificationProvider): Promise<INotificationProviderHealth> {
    const { providerKey } = provider.getMetadata();
    let result: INotificationProviderHealth;

    try {
      result = await provider.getHealth();
    } catch (error) {
      const previous = this.lastKnown.get(providerKey);
      result = {
        providerKey,
        status: NotificationProviderHealthStatus.UNHEALTHY,
        lifecycleStatus:
          previous?.lifecycleStatus ?? NotificationProviderLifecycleStatus.UNAVAILABLE,
        lastCheckedAt: new Date(),
        message: (error as Error).message,
      };
    }

    this.recordHealth(result);
    return result;
  }

  private recordHealth(health: INotificationProviderHealth): void {
    const previous = this.lastKnown.get(health.providerKey);
    this.lastKnown.set(health.providerKey, health);

    if (previous && previous.status !== health.status) {
      this.eventEmitter.emit({
        type: NotificationProviderEventType.PROVIDER_HEALTH_CHANGED,
        providerKey: health.providerKey,
        occurredAt: new Date(),
        payload: { previousStatus: previous.status, currentStatus: health.status },
      });
    }
  }

  getHealth(providerKey: string): INotificationProviderHealth | undefined {
    return this.lastKnown.get(providerKey);
  }

  getAllHealth(): INotificationProviderHealth[] {
    return Array.from(this.lastKnown.values());
  }
}
