import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { MarketplaceListingTransformJobPayload } from '../interfaces';
import { MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MarketplaceListingTransformQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MarketplaceListingTransformQueue.name);
  private queue: Queue<MarketplaceListingTransformJobPayload> | null = null;

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
          attempts: MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: MARKETPLACE_LISTING_TRANSFORMATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<MarketplaceListingTransformJobPayload>(
        QUEUE_NAMES.MARKETPLACE_LISTING_TRANSFORMATION,
        opts,
      );
      this.logger.log('Marketplace Listing Transformation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Marketplace Listing Transformation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: MarketplaceListingTransformJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Marketplace Listing Transformation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('marketplace-transform', payload, {
        jobId: `mlp-transform-${payload.marketplaceListingId}-${Date.now()}`,
      });
      this.logger.log(`Queued marketplace transformation for ${payload.marketplaceListingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue marketplace transformation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }
}
