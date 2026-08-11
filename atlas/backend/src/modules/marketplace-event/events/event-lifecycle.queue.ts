import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { EventLifecycleEvent } from '../interfaces';

export interface EventLifecyclePayload {
  event: EventLifecycleEvent;
  workspaceId: string;
  accountId: string;
  eventId?: string;
  eventType?: string;
  data?: Record<string, any>;
  timestamp: Date;
}

@Injectable()
export class EventLifecycleQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_EVENT_LIFECYCLE)
    private readonly queue: Queue<EventLifecyclePayload>,
  ) {}

  async publish(payload: Omit<EventLifecyclePayload, 'timestamp'>): Promise<void> {
    await this.queue.add(payload.event, {
      ...payload,
      timestamp: new Date(),
    });
  }

  async publishBatch(payloads: Array<Omit<EventLifecyclePayload, 'timestamp'>>): Promise<void> {
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
