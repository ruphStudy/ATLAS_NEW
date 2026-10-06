import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProfitCalculationJobPayload } from '../interfaces';
import { PROFIT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProfitCalculatorQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ProfitCalculatorQueue.name);
  private queue: Queue<ProfitCalculationJobPayload> | null = null;

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
          attempts: PROFIT_QUEUE_CONFIG.ATTEMPTS,
          backoff: {
            type: 'exponential',
            delay: PROFIT_QUEUE_CONFIG.BACKOFF_DELAY_MS,
          },
          removeOnComplete: PROFIT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PROFIT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };

      this.queue = new Queue<ProfitCalculationJobPayload>(
        QUEUE_NAMES.PROFIT_CALCULATOR,
        queueOptions,
      );

      this.logger.log('Profit Calculator queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize queue: ${error instanceof Error ? error.message : 'Unknown error'}. Queue operations will be skipped.`,
      );
      this.queue = null;
    }
  }

  async addJob(payload: ProfitCalculationJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Queue not available. Calculation must be triggered manually.');
      return;
    }

    try {
      await this.queue.add('calculate-profit', payload, {
        jobId: `profit-${payload.calculationId}`,
        removeOnComplete: true,
      });
      this.logger.log(`Queued profit calculation job: ${payload.calculationId}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue job: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw error;
    }
  }

  async getJobStatus(calculationId: string): Promise<string | null> {
    if (!this.queue) return null;
    try {
      const job = await this.queue.getJob(`profit-${calculationId}`);
      return job ? await job.getState() : null;
    } catch {
      return null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Profit Calculator queue closed');
    }
  }
}
