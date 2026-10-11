import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { CapabilityEventPayload } from '../interfaces';
import { MP_CAPABILITY_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceCapabilityEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceCapabilityEventQueue.name);
  private readonly queue: Queue<CapabilityEventPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<CapabilityEventPayload>(QUEUE_NAMES.MARKETPLACE_CAPABILITY_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: MP_CAPABILITY_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_CAPABILITY_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_CAPABILITY_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_CAPABILITY_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: CapabilityEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue capability event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
