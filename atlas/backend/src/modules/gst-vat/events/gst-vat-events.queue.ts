import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ConfigurationService } from '@config/configuration.service';
import { QUEUE_NAMES } from '@common/constants';
import { GstVatEventPayload } from '../interfaces';
import { GST_VAT_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class GstVatEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(GstVatEventQueue.name);
  private readonly queue: Queue;

  constructor(configService: ConfigurationService) {
    const redis = configService.getRedisConfig();
    this.queue = new Queue(QUEUE_NAMES.GST_VAT_EVENTS, {
      connection: { host: redis.host, port: redis.port, password: redis.password, db: redis.db, tls: redis.tls ? {} : undefined },
      defaultJobOptions: {
        attempts: GST_VAT_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: GST_VAT_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: GST_VAT_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: GST_VAT_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: GstVatEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue GST/VAT event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
