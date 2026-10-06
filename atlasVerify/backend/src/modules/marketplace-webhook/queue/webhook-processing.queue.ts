import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { NormalizedWebhookPayload } from '../interfaces';

export interface WebhookProcessingJobPayload {
  deliveryId: string;
  workspaceId: string;
  accountId: string;
  webhookConfigId: string;
  payload: NormalizedWebhookPayload;
  attemptCount: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class WebhookProcessingQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_WEBHOOK_PROCESSING)
    private readonly queue: Queue<WebhookProcessingJobPayload>,
  ) {}

  async enqueue(payload: WebhookProcessingJobPayload, delay?: number): Promise<void> {
    await this.queue.add('process-webhook', payload, {
      jobId: `${payload.deliveryId}-${payload.attemptCount}`,
      delay,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: {
        age: 86400, // 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 604800, // 7 days
      },
    });
  }

  async getJob(jobId: string) {
    return this.queue.getJob(jobId);
  }
}
