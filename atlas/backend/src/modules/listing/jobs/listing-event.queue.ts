import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ListingEventPayload } from '../interfaces';
import { LISTING_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ListingEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingEventQueue.name);
  private queue: Queue<ListingEventPayload> | null = null;

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
          attempts: LISTING_EVENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: LISTING_EVENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: LISTING_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: LISTING_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ListingEventPayload>(QUEUE_NAMES.LISTING_EVENTS, opts);
      this.logger.log('Listing Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ListingEventPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Listing Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('listing-event', payload, {
        jobId: `listing-${payload.listingId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued listing event: ${payload.event} for ${payload.listingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue listing event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
