import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { ReceivingEventPayload } from './receiving-event.queue';

@Processor('receiving-events')
export class ReceivingEventWorker extends WorkerHost {
  private readonly logger = new Logger(ReceivingEventWorker.name);

  async process(job: Job<ReceivingEventPayload>): Promise<void> {
    const { workspaceId, receivingId, receivingNumber, event, metadata } = job.data;

    this.logger.log(`Processing receiving event: ${event} for workspace ${workspaceId}`);

    this.logger.debug({
      workspaceId,
      receivingId,
      receivingNumber,
      event,
      metadata,
    });
  }
}
