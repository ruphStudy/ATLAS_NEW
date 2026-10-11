import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { ShippingProviderExpansionEventPayload } from '../interfaces';
import { SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ShippingProviderExpansionEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ShippingProviderExpansionEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.SHIPPING_PROVIDER_EXPANSION_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: SHIPPING_PROVIDER_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: ShippingProviderExpansionEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue shipping provider expansion event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
