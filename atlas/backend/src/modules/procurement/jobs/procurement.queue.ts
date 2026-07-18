import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { ProcurementJobPayload } from '../interfaces';
import { PROCUREMENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class ProcurementQueue implements OnModuleDestroy {
  private readonly logger = new Logger(ProcurementQueue.name);
  private queue: Queue<ProcurementJobPayload> | null = null;

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
          attempts: PROCUREMENT_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PROCUREMENT_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PROCUREMENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PROCUREMENT_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<ProcurementJobPayload>(QUEUE_NAMES.PROCUREMENT, opts);
      this.logger.log('Procurement queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Procurement queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: ProcurementJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Procurement queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('procurement-event', payload, {
        jobId: `proc-${payload.procurementId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for ${payload.procurementNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue procurement event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Procurement queue closed');
    }
  }
}
