import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AvailabilityEventPayload } from './availability-event.queue';

@Processor('inventory-availability-events')
export class AvailabilityEventWorker extends WorkerHost {
  private readonly logger = new Logger(AvailabilityEventWorker.name);

  async process(job: Job<AvailabilityEventPayload>): Promise<void> {
    const { event, inventoryItemId, workspaceId, sku, warehouseId } = job.data;

    this.logger.log(
      `Processing availability event: ${event} for item ${inventoryItemId} (SKU: ${sku}) in workspace ${workspaceId}`,
    );

    // Event processing logic can be added here for integrations, notifications, etc.
  }
}
