import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { TaxEventPayload } from '../interfaces';
import { TAX_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class TaxEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(TaxEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.TAX_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: TAX_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: TAX_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: TAX_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: TAX_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: TaxEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue tax event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
