import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { PurchaseOrderJobPayload } from '../interfaces';
import { PO_QUEUE_CONFIG } from '../constants';

@Injectable()
export class PurchaseOrderQueue implements OnModuleDestroy {
  private readonly logger = new Logger(PurchaseOrderQueue.name);
  private queue: Queue<PurchaseOrderJobPayload> | null = null;

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
          attempts: PO_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: PO_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: PO_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: PO_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<PurchaseOrderJobPayload>(QUEUE_NAMES.PURCHASE_ORDER, opts);
      this.logger.log('Purchase Order queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Purchase Order queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: PurchaseOrderJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Purchase Order queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('purchase-order-event', payload, {
        jobId: `po-${payload.purchaseOrderId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued event: ${payload.event} for ${payload.poNumber}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue Purchase Order event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
      this.logger.log('Purchase Order queue closed');
    }
  }
}
