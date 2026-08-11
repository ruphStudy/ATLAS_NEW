import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { BarcodeEventPayload } from './barcode-event.queue';

@Processor('barcode-events')
export class BarcodeEventWorker extends WorkerHost {
  private readonly logger = new Logger(BarcodeEventWorker.name);

  async process(job: Job<BarcodeEventPayload>): Promise<void> {
    const { workspaceId, barcodeId, event, metadata } = job.data;

    this.logger.log(`Processing barcode event: ${event} for workspace ${workspaceId}`);

    // Event processing logic would go here
    // For now, just log the event
    this.logger.debug({
      workspaceId,
      barcodeId,
      event,
      metadata,
    });
  }
}
