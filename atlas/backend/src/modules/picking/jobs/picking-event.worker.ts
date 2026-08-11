import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PickingEventPayload } from './picking-event.queue';

@Processor('picking-events')
export class PickingEventWorker extends WorkerHost {
  private readonly logger = new Logger(PickingEventWorker.name);

  async process(job: Job<PickingEventPayload>): Promise<void> {
    const { workspaceId, taskId, taskNumber, event, metadata } = job.data;

    this.logger.log(`Processing picking event: ${event} for workspace ${workspaceId}`);

    this.logger.debug({
      workspaceId,
      taskId,
      taskNumber,
      event,
      metadata,
    });
  }
}
