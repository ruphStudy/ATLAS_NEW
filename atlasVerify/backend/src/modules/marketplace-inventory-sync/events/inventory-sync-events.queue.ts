import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { InventorySyncEventPayload } from '../interfaces';
import { MP_INVENTORY_SYNC_QUEUE_CONFIG } from '../constants';

@Injectable()
export class InventorySyncEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(InventorySyncEventQueue.name);
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_INVENTORY_SYNC_EVENTS, {
      defaultJobOptions: {
        attempts: MP_INVENTORY_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_INVENTORY_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_INVENTORY_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_INVENTORY_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: InventorySyncEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue inventory sync event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
