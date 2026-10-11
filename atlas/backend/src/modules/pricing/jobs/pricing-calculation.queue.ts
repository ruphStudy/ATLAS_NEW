import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PricingCalculationJobPayload } from '../interfaces';
import { PRICING_CALCULATION_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PricingCalculationQueue implements OnModuleDestroy {
  private readonly logger = new Logger(PricingCalculationQueue.name);
  private queue: Queue<PricingCalculationJobPayload> | null = null;

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
          attempts: PRICING_CALCULATION_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PRICING_CALCULATION_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PRICING_CALCULATION_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PRICING_CALCULATION_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<PricingCalculationJobPayload>(QUEUE_NAMES.PRICING_CALCULATION, opts);
      this.logger.log('Pricing Calculation queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Pricing Calculation queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: PricingCalculationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Pricing Calculation queue unavailable — job skipped');
      return;
    }
    try {
      await this.queue.add('pricing-calculate', payload, {
        jobId: `pricing-calc-${payload.pricingRecordId}-${Date.now()}`,
      });
      this.logger.log(`Queued pricing calculation for record ${payload.pricingRecordId}`);
    } catch (error) {
      this.logger.error(
        `Failed to enqueue pricing calculation: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) await this.queue.close();
  }
}
