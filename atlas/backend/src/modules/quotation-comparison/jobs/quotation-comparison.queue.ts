import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { QuotationComparedJobPayload } from '../interfaces';
import { QUOTATION_COMPARISON_QUEUE_CONFIG } from '../constants';

@Injectable()
export class QuotationComparisonQueue implements OnModuleDestroy {
  private readonly logger = new Logger(QuotationComparisonQueue.name);
  private queue: Queue<QuotationComparedJobPayload> | null = null;

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
          attempts: QUOTATION_COMPARISON_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: QUOTATION_COMPARISON_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: QUOTATION_COMPARISON_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: QUOTATION_COMPARISON_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<QuotationComparedJobPayload>(QUEUE_NAMES.QUOTATION_COMPARISON, opts);
      this.logger.log('Quotation Comparison queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Quotation Comparison queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: QuotationComparedJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Quotation Comparison queue unavailable — event skipped');
      return;
    }

    try {
      await this.queue.add('quotation-comparison-event', payload, {
        jobId: `qc-${payload.comparisonId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for comparison ${payload.comparisonId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue comparison event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Quotation Comparison queue closed');
    }
  }
}
