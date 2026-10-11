import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProductCostJobPayload } from '../interfaces';
import { PRODUCT_COST_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProductCostQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ProductCostQueue.name);
  private queue: Queue<ProductCostJobPayload> | null = null;

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
          attempts: PRODUCT_COST_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PRODUCT_COST_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PRODUCT_COST_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PRODUCT_COST_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ProductCostJobPayload>(QUEUE_NAMES.PRODUCT_COST, opts);
      this.logger.log('Product Cost queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Product Cost queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ProductCostJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Product Cost queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('product-cost-event', payload, {
        jobId: `pc-${payload.calculationId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for calculation ${payload.calculationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue Product Cost event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Product Cost queue closed');
    }
  }
}
