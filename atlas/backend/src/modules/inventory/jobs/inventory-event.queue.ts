import { Queue, QueueOptions } from 'bullmq';
import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigurationService } from '@config/index';
import { QUEUE_NAMES } from '@common/constants';
import { InventoryJobPayload } from '../interfaces';
import { INVENTORY_QUEUE_CONFIG } from '../constants';

@Injectable()
export class InventoryEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InventoryEventQueue.name);
  private queue: Queue<InventoryJobPayload> | null = null;

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
          attempts: INVENTORY_QUEUE_CONFIG.ATTEMPTS,
          backoff: { type: 'exponential', delay: INVENTORY_QUEUE_CONFIG.BACKOFF_DELAY_MS },
          removeOnComplete: INVENTORY_QUEUE_CONFIG.REMOVE_ON_COMPLETE_COUNT,
          removeOnFail: INVENTORY_QUEUE_CONFIG.REMOVE_ON_FAIL_COUNT,
        },
      };
      this.queue = new Queue<InventoryJobPayload>(QUEUE_NAMES.INVENTORY_EVENTS, opts);
      this.logger.log('Inventory Event queue initialized');
    } catch (error) {
      this.logger.warn(
        `Failed to initialize Inventory Event queue: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      this.queue = null;
    }
  }

  async enqueue(payload: InventoryJobPayload): Promise<void> {
    if (!this.queue) {
      this.logger.warn('Inventory Event queue unavailable — event skipped');
      return;
    }
    try {
      await this.queue.add('inventory-event', payload, {
        jobId: `inv-${payload.inventoryItemId}-${payload.event}-${Date.now()}`,
      });
      this.logger.log(`Queued inventory event: ${payload.event} for ${payload.sku}`);
    } catch (error) {
      this.logger.error(
        `Failed to queue inventory event: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
  }
}
