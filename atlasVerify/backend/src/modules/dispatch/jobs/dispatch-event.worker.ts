import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { DispatchEventPayload } from './dispatch-event.queue';

@Processor('dispatch-events')
export class DispatchEventWorker extends WorkerHost {
  private readonly logger = new Logger(DispatchEventWorker.name);

  async process(job: Job<DispatchEventPayload>): Promise<void> {
    const { workspaceId, taskId, taskNumber, event, metadata } = job.data;

    this.logger.log(`Processing dispatch event: ${event} for workspace ${workspaceId}`);

    this.logger.debug({
      workspaceId,
      taskId,
      taskNumber,
      event,
      metadata,
    });
  }
}
