import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IWebhookFrameworkEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.WEBHOOK_FRAMEWORK_EVENTS)
export class WebhookFrameworkEventWorker extends WorkerHost {
  private readonly logger = new Logger(WebhookFrameworkEventWorker.name);

  async process(job: Job<IWebhookFrameworkEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: webhook endpoint ${job.data.endpointId}`);
  }
}
