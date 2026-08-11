import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';

export interface IWebhookDeliveryJobPayload {
  deliveryId: string;
}

/**
 * One BullMQ job per delivery row — `jobId: deliveryId` makes re-enqueuing
 * the same delivery an idempotent no-op. Retries are handled by BullMQ's
 * own `attempts`/`backoff` mechanism (the worker throws on failure), not a
 * manual DB-driven sweep; `WebhookDeliveryWorker`'s `failed` handler marks
 * the row dead-lettered once attempts are exhausted.
 */
@Injectable()
export class WebhookDeliveryQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.WEBHOOK_DELIVERY)
    private readonly queue: Queue<IWebhookDeliveryJobPayload>,
  ) {}

  async enqueue(deliveryId: string, maxAttempts: number, backoffMs: number): Promise<void> {
    await this.queue.add(
      'deliver',
      { deliveryId },
      {
        jobId: deliveryId,
        attempts: maxAttempts,
        backoff: {
          type: 'exponential',
          delay: backoffMs,
        },
        removeOnComplete: {
          age: 86400, // 24 hours
          count: 1000,
        },
        removeOnFail: {
          age: 604800, // 7 days
        },
      },
    );
  }

  /** Removes the job if it hasn't finished yet — returns `false` if it already completed/failed or never existed. */
  async cancel(deliveryId: string): Promise<boolean> {
    const job = await this.queue.getJob(deliveryId);
    if (!job) return false;

    const state = await job.getState();
    if (state === 'completed' || state === 'failed') return false;

    await job.remove();
    return true;
  }
}
