import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { AnalysisJobPayload } from '../interfaces';
import { ANALYSIS_QUEUE_CONFIG } from '../constants';

/**
 * Product Analysis Queue
 * Manages async analysis job execution with BullMQ.
 */
@Injectable()
export class ProductAnalysisQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ProductAnalysisQueue.name);
  private queue: Queue<AnalysisJobPayload> | null = null;

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
          tls: redisConfig.tls ? {} : undefined,
          db: redisConfig.db,
        },
        defaultJobOptions: {
          attempts: ANALYSIS_QUEUE_CONFIG.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: ANALYSIS_QUEUE_CONFIG.BACKOFF_DELAY_MS,
          },
          removeOnComplete: ANALYSIS_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: ANALYSIS_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<AnalysisJobPayload>(
        QUEUE_NAMES.PRODUCT_ANALYSIS,
        queueOptions,
      );

      this.logger.log('Product Analysis queue initialized successfully');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize queue: ${error instanceof Error ? error.message : 'Unknown error'}. Queue operations will be skipped.`,
      );
      this.queue = null;
    }
  }

  async addAnalysisJob(payload: AnalysisJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn(
        'Queue not available. Analysis will need to be triggered manually.',
      );
      return;
    }

    try {
      await this.queue.add('analyze-product', payload, {
        jobId: `analysis-${payload.analysisId}`,
        removeOnComplete: true,
      });

      this.logger.log(`Queued analysis job: ${payload.analysisId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue analysis job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getJobStatus(analysisId: string): Promise<string | null> {
    if (!this.queue) {
      return null;
    }

    try {
      const job = await this.queue.getJob(`analysis-${analysisId}`);
      return job ? await job.getState() : null;
    } catch (error) {
      this.logger.error(
        `Failed to get job status: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Product Analysis queue closed');
    }
  }
}
