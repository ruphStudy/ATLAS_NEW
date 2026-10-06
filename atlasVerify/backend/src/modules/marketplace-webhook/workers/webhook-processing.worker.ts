import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../common/constants';
import { WebhookProcessingJobPayload } from '../queue/webhook-processing.queue';
import { WebhookHandler } from '../handler/webhook-handler';

@Processor(QUEUE_NAMES.MARKETPLACE_WEBHOOK_PROCESSING)
export class WebhookProcessingWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessingWorker.name);

  constructor(private readonly handler: WebhookHandler) {
    super();
  }

  async process(job: Job<WebhookProcessingJobPayload>): Promise<void> {
    this.logger.log(`Processing webhook delivery: ${job.data.deliveryId} [Attempt ${job.data.attemptCount}]`);

    await this.handler.processDelivery({
      deliveryId: job.data.deliveryId,
      workspaceId: job.data.workspaceId,
      accountId: job.data.accountId,
      webhookConfigId: job.data.webhookConfigId,
      payload: job.data.payload,
    });
  }
}
