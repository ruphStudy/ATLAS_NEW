import { Injectable, Logger } from '@nestjs/common';
import {
  AiProviderEventType,
  AiProviderHealthStatus,
  AiProviderLifecycleStatus,
  IAiProvider,
  IAiProviderHealth,
} from '../interfaces';
import { AiProviderEventEmitter } from '../events/ai-provider-event.emitter';

/**
 * AiProviderHealthService
 *
 * Tracks the last known health/lifecycle status per provider and emits a
 * `PROVIDER_HEALTH_CHANGED` event whenever a check reports a different
 * status than the previous one.
 */
@Injectable()
export class AiProviderHealthService {
  private readonly logger = new Logger(AiProviderHealthService.name);
  private readonly health = new Map<string, IAiProviderHealth>();

  constructor(private readonly eventEmitter: AiProviderEventEmitter) {}

  async checkHealth(provider: IAiProvider): Promise<IAiProviderHealth> {
    const providerKey = provider.getMetadata().providerKey;

    let result: IAiProviderHealth;
    try {
      result = await provider.getHealth();
    } catch (error) {
      this.logger.error(`Health check failed for provider '${providerKey}'`, error);
      result = {
        providerKey,
        status: AiProviderHealthStatus.UNHEALTHY,
        lifecycleStatus:
          this.health.get(providerKey)?.lifecycleStatus ?? AiProviderLifecycleStatus.UNAVAILABLE,
        lastCheckedAt: new Date(),
        message: error instanceof Error ? error.message : 'Unknown health check error',
      };
    }

    this.recordHealth(result);
    return result;
  }

  recordHealth(health: IAiProviderHealth): void {
    const previous = this.health.get(health.providerKey);
    this.health.set(health.providerKey, health);

    if (!previous || previous.status !== health.status) {
      this.eventEmitter.emit({
        type: AiProviderEventType.PROVIDER_HEALTH_CHANGED,
        providerKey: health.providerKey,
        occurredAt: new Date(),
        payload: { previousStatus: previous?.status, currentStatus: health.status },
      });
    }
  }

  getHealth(providerKey: string): IAiProviderHealth | undefined {
    return this.health.get(providerKey);
  }

  getAllHealth(): IAiProviderHealth[] {
    return Array.from(this.health.values());
  }
}
