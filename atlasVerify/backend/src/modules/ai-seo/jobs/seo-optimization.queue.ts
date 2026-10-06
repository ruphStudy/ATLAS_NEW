import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { SeoOptimizationJobPayload } from '../interfaces';
import { SEO_OPTIMIZATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class SeoOptimizationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(SeoOptimizationQueue.name);
  private queue: Queue<SeoOptimizationJobPayload> | null = null;

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
          attempts: SEO_OPTIMIZATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: SEO_OPTIMIZATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: SEO_OPTIMIZATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: SEO_OPTIMIZATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<SeoOptimizationJobPayload>(QUEUE_NAMES.AI_SEO_OPTIMIZATION, opts);
      this.logger.log('SEO Optimization queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize SEO Optimization queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: SeoOptimizationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('SEO Optimization queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('seo-optimize', payload, {
        jobId: `seo-opt-${payload.seoId}-${Date.now()}`,
      });
      this.logger.log(`Queued SEO optimization for ${payload.seoId} (sections: ${payload.sections.join(', ')})`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue SEO optimization job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
