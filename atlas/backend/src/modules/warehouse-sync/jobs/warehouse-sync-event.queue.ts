import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface WarehouseSyncEventPayload {
  event: string;
  workspaceId: string;
  syncJobId?: string;
  configurationId?: string;
  sourceWarehouseId?: string;
  targetWarehouseId?: string;
  conflictId?: string;
  inventoryItemId?: string;
  [key: string]: unknown;
}

@Injectable()
export class WarehouseSyncEventQueue {
  private readonly logger = new Logger(WarehouseSyncEventQueue.name);

  constructor(
    @InjectQueue('warehouse-sync-events') private readonly queue: Queue,
  ) {}

  async publish(payload: WarehouseSyncEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload, {
        removeOnComplete: 100,
        removeOnFail: 500,
      });
      this.logger.debug(`Published event: ${payload.event}`);
    } catch (error) {
      this.logger.error(
        `Failed to publish event ${payload.event}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
