import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PutawayEventPayload } from './putaway-event.queue';

@Processor('putaway-events')
export class PutawayEventWorker extends WorkerHost {
  private readonly logger = new Logger(PutawayEventWorker.name);

  async process(job: Job<PutawayEventPayload>): Promise<void> {
    const { workspaceId, taskId, taskNumber, event, metadata } = job.data;

    this.logger.log(`Processing putaway event: ${event} for workspace ${workspaceId}`);

    this.logger.debug({
      workspaceId,
      taskId,
      taskNumber,
      event,
      metadata,
    });
  }
}
