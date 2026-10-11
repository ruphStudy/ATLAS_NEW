import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { MarketplaceExpansionEventPayload } from '../interfaces';
import { MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceExpansionEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceExpansionEventQueue.name);
  private readonly queue: Queue<MarketplaceExpansionEventPayload>;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue<MarketplaceExpansionEventPayload>(QUEUE_NAMES.MARKETPLACE_EXPANSION_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MARKETPLACE_EXPANSION_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: MarketplaceExpansionEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue marketplace expansion event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
