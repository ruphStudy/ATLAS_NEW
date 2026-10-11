import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ConfigurationService } from '@config/configuration.service';
import { ListingSyncEventPayload } from '../interfaces';
import { MP_LISTING_SYNC_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ListingSyncEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingSyncEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_LISTING_SYNC_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: MP_LISTING_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_LISTING_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_LISTING_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_LISTING_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: ListingSyncEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue listing sync event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
