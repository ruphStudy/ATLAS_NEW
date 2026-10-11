import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { ProviderFactoryEventPayload } from '../interfaces';
import { MP_FACTORY_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceProviderFactoryEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceProviderFactoryEventQueue.name);
  private readonly queue: Queue<ProviderFactoryEventPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<ProviderFactoryEventPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_FACTORY_EVENTS,
      {
        connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      },
    );
  }

  async enqueue(payload: ProviderFactoryEventPayload): Promise<void> {
    try {
      await this.queue.add(
        `${payload.event}-${payload.workspaceId}-${Date.now()}`,
        payload,
        {
          attempts: MP_FACTORY_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: MP_FACTORY_EVENT_QUEUE_CONFIG.BACKOFF_MS },
          removeOnComplete: MP_FACTORY_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
          removeOnFail: MP_FACTORY_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
        },
      );
      this.logger.debug(
        `Enqueued factory event '${payload.event}' for '${payload.providerKey}' ws='${payload.workspaceId}'`,
      );
    } catch (err) {
      // Never let event publishing failures break the critical path
      this.logger.warn(`Failed to enqueue factory event '${payload.event}'`, { error: (err as Error).message });
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
