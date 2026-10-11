import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { TransformationJobPayload } from '../interfaces';
import { TRANSFORMATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class TransformationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(TransformationQueue.name);
  private queue: Queue<TransformationJobPayload> | null = null;

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
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: TRANSFORMATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: TRANSFORMATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: TRANSFORMATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: TRANSFORMATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<TransformationJobPayload>(QUEUE_NAMES.MARKETPLACE_TRANSFORMATION, opts);
      this.logger.log('Transformation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Transformation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: TransformationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Transformation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('transform', payload, {
        jobId: `transform-${payload.jobId}`,
        // Deduplication: prevent same job being enqueued twice
        deduplication: { id: `dedup-${payload.listingId}-${payload.marketplaceKey}` },
      } as Parameters<typeof this.queue.add>[2]);
      this.logger.log(`Queued transformation job ${payload.jobId} for listing ${payload.listingId}`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue transformation job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }
}
