import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProductScoringJobPayload } from '../interfaces';
import { SCORING_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProductScoringQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ProductScoringQueue.name);
  private queue: Queue<ProductScoringJobPayload> | null = null;

  constructor(private readonly configService: ConfigurationService) {
    this.initializeQueue();
  }

  private initializeQueue(): void {
    try {
      const redisConfig = this.configService.getRedisConfig();

      const queueOptions: QueueOptions = {
        connection: {
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: SCORING_QUEUE_CONFIG.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: SCORING_QUEUE_CONFIG.BACKOFF_DELAY_MS,
          },
          removeOnComplete: SCORING_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: SCORING_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<ProductScoringJobPayload>(
        QUEUE_NAMES.PRODUCT_SCORING,
        queueOptions,
      );

      this.logger.log('Product Scoring queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize queue: ${error instanceof Error ? error.message : 'Unknown error'}. Queue operations will be skipped.`,
      );
      this.queue = null;
    }
  }

  async addJob(payload: ProductScoringJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Queue not available. Scoring must be triggered manually.');
      return;
    }

    try {
      await this.queue.add('score-product', payload, {
        jobId: `scoring-${payload.scoringId}`,
        removeOnComplete: true,
      });
      this.logger.log(`Queued product scoring job: ${payload.scoringId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getJobStatus(scoringId: string): Promise<string | null> {
    if (!this.queue) return null;
    try {
      const job = await this.queue.getJob(`scoring-${scoringId}`);
      return job ? await job.getState() : null;
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Product Scoring queue closed');
    }
  }
}
