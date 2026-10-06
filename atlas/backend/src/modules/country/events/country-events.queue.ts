import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { CountryEventPayload } from '../interfaces';
import { COUNTRY_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CountryEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(CountryEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.COUNTRY_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db },
      defaultJobOptions: {
        attempts: COUNTRY_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: COUNTRY_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: COUNTRY_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: COUNTRY_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: CountryEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue country event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
