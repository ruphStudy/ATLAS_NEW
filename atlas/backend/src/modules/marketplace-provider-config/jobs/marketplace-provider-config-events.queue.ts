import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { ConfigurationEventPayload } from '../interfaces';
import { MP_CONFIG_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceProviderConfigEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceProviderConfigEventQueue.name);
  private readonly queue: Queue<ConfigurationEventPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<ConfigurationEventPayload>(
      QUEUE_NAMES.MARKETPLACE_PROVIDER_CONFIG_EVENTS,
      {
        connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      },
    );
  }

  async enqueue(payload: ConfigurationEventPayload): Promise<void> {
    await this.queue.add(
      `${payload.event}-${payload.configId}-${Date.now()}`,
      payload,
      {
        attempts: MP_CONFIG_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_CONFIG_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_CONFIG_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_CONFIG_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    );
    this.logger.debug(`Enqueued config event '${payload.event}' for '${payload.providerKey}'`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
