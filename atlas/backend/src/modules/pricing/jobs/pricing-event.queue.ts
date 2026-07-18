import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PricingEventPayload } from '../interfaces';
import { PRICING_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PricingEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(PricingEventQueue.name);
  private queue: Queue<PricingEventPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();
      const opts: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: PRICING_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PRICING_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PRICING_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PRICING_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<PricingEventPayload>(QUEUE_NAMES.PRICING_EVENTS, opts);
      this.logger.log('Pricing Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Pricing Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: PricingEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Pricing Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('pricing-event', payload, {
        jobId: `pricing-event-${payload.pricingRecordId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued pricing event: ${payload.event} for ${payload.pricingRecordId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue pricing event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }
}
