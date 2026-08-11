import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PackingEventPayload } from './packing-event.queue';

@Processor('packing-events')
export class PackingEventWorker extends WorkerHost {
  private readonly logger = new Logger(PackingEventWorker.name);

  async process(job: Job<PackingEventPayload>): Promise<void> {
    const { workspaceId, taskId, taskNumber, event, metadata } = job.data;

    this.logger.log(`Processing packing event: ${event} for workspace ${workspaceId}`);

    this.logger.debug({
      workspaceId,
      taskId,
      taskNumber,
      event,
      metadata,
    });
  }
}
