import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { EventProcessingJobPayload } from '../queue/event-processing.queue';
import { EventHandler } from '../handler/event-handler';

@Processor(QUEUE_NAMES.MARKETPLACE_EVENT_PROCESSING)
export class EventProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(EventProcessingWorker.name);

  constructor(private readonly handler: EventHandler) {
    super();
  }

  async process(job: Job<EventProcessingJobPayload>): Promise<void> {
    this.logger.log(`Processing event: ${job.data.eventId} [Type: ${job.data.eventType}, Attempt: ${job.data.attemptCount}]`);

    await this.handler.processEvent({
      eventId: job.data.eventId,
      workspaceId: job.data.workspaceId,
      accountId: job.data.accountId,
      providerKey: job.data.providerKey,
      marketplaceKey: job.data.marketplaceKey,
      eventType: job.data.eventType,
      category: job.data.category,
      payload: job.data.payload,
      attemptCount: job.data.attemptCount,
      metadata: job.data.metadata,
    });
  }
}
