import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { WebhookLifecycleEvent } from '../interfaces';

export interface WebhookEventPayload {
  event: WebhookLifecycleEvent;
  workspaceId: string;
  accountId: string;
  webhookConfigId?: string;
  deliveryId?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class WebhookEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_WEBHOOK_EVENTS)
    private readonly queue: Queue<WebhookEventPayload>,
  ) {}

  async publish(payload: Omit<WebhookEventPayload, 'timestamp'>): Promise<void> {
    await this.queue.add(payload.event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  async publishBatch(payloads: Array<Omit<WebhookEventPayload, 'timestamp'>>): Promise<void> {
    const jobs = payloads.map((payload) => ({
      name: payload.event,
      data: {
        ...payload,
        timestamp: new Date(),
      },
    }));
    await this.queue.addBulk(jobs);
  }
}
