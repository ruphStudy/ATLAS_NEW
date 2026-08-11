import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import type { WarehouseEventPayload } from './warehouse-event.queue';

@Processor('warehouse-events')
export class WarehouseEventWorker extends WorkerHost {
  private readonly logger = new Logger(WarehouseEventWorker.name);

  async process(job: Job<WarehouseEventPayload>): Promise<void> {
    const { warehouseId, code, workspaceId, event, metadata } = job.data;

    this.logger.log(
      `Processing warehouse event: ${event} for warehouse ${code} (${warehouseId}) in workspace ${workspaceId}`,
    );

    // Event processing logic would go here (e.g., webhooks, notifications, analytics)
    // For now, we just log the event
  }
}
