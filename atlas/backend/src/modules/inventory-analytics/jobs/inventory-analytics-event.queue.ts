import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface InventoryAnalyticsEventPayload {
  event: string;
  workspaceId: string;
  warehouseId?: string;
  inventoryItemId?: string;
  cacheKeys?: string[];
  [key: string]: unknown;
}

@Injectable()
export class InventoryAnalyticsEventQueue {
  private readonly logger = new Logger(InventoryAnalyticsEventQueue.name);

  constructor(
    @InjectQueue('inventory-analytics-events') private readonly queue: Queue,
  ) {}

  async publish(payload: InventoryAnalyticsEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      this.logger.debug(`Published analytics event: ${payload.event}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish analytics event ${payload.event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
