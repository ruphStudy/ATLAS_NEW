import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ReorderEventPayload } from './reorder-event.queue';

@Processor('reorder-events')
export class ReorderEventWorker extends WorkerHost {
  private readonly logger = new Logger(ReorderEventWorker.name);

  async process(job: Job<ReorderEventPayload>): Promise<void> {
    const { event, inventoryItemId, workspaceId, sku, warehouseId } = job.data;

    this.logger.log(
      `Processing reorder event: ${event} for item ${inventoryItemId} (SKU: ${sku}) in workspace ${workspaceId}`,
    );

    // Event processing logic can be added here for integrations, notifications, etc.
  }
}
