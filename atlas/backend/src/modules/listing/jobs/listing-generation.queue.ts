import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ListingGenerationJobPayload } from '../interfaces';
import { LISTING_GENERATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ListingGenerationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ListingGenerationQueue.name);
  private queue: Queue<ListingGenerationJobPayload> | null = null;

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
          attempts: LISTING_GENERATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: LISTING_GENERATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: LISTING_GENERATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: LISTING_GENERATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ListingGenerationJobPayload>(QUEUE_NAMES.LISTING_GENERATION, opts);
      this.logger.log('Listing Generation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Listing Generation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ListingGenerationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Listing Generation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('listing-generate', payload, {
        jobId: `listing-gen-${payload.listingId}-${Date.now()}`,
      });
      this.logger.log(
        `Queued listing generation for ${payload.listingId} (sections: ${payload.sections.join(', ')})`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to enqueue listing generation job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
