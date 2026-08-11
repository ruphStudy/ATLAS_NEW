import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { CatalogSyncEventPayload } from '../interfaces';
import { MP_CATALOG_SYNC_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CatalogSyncEventQueue {
  private readonly logger = new Logger(CatalogSyncEventQueue.name);
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_CATALOG_SYNC_EVENTS, {
      defaultJobOptions: {
        attempts: MP_CATALOG_SYNC_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_CATALOG_SYNC_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_CATALOG_SYNC_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_CATALOG_SYNC_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: CatalogSyncEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue catalog sync event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
