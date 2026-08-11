import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { WebhookFrameworkService } from '../webhook-framework.service';
import { IWebhookDeliveryJobPayload } from './webhook-delivery.queue';

@Processor(QUEUE_NAMES.WEBHOOK_DELIVERY)
export class WebhookDeliveryWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookDeliveryWorker.name);

  constructor(private readonly service: WebhookFrameworkService) {
    super();
  }

  async process(job: Job<IWebhookDeliveryJobPayload>): Promise<void> {
    await this.service.attemptDelivery(job.data.deliveryId, job.attemptsMade + 1);
  }

  /** BullMQ's own `attempts` count is exhausted once this fires with `job.attemptsMade >= opts.attempts` — that's the dead-letter boundary. */
  @OnWorkerEvent('failed')
  async onFailed(job: Job<IWebhookDeliveryJobPayload> | undefined): Promise<void> {
    if (!job) return;
    const maxAttempts = job.opts.attempts ?? 1;
    if (job.attemptsMade >= maxAttempts) {
      await this.service.markDeadLettered(job.data.deliveryId, job.failedReason ?? 'Delivery attempts exhausted');
    }
  }
}
