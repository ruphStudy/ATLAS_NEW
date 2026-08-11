import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { MarketplaceEventType, EventCategory, EventPriority } from '../interfaces';

export interface EventProcessingJobPayload {
  eventId: string;
  workspaceId: string;
  accountId: string;
  providerKey: string;
  marketplaceKey: string;
  eventType: MarketplaceEventType;
  category: EventCategory;
  priority: EventPriority;
  payload: Record<string, any>;
  attemptCount: number;
  metadata?: Record<string, any>;
}

@Injectable()
export class EventProcessingQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_EVENT_PROCESSING)
    private readonly queue: Queue<EventProcessingJobPayload>,
  ) {}

  async enqueue(payload: EventProcessingJobPayload, delay?: number): Promise<void> {
    const priorityMap = {
      [EventPriority.CRITICAL]: 10,
      [EventPriority.HIGH]: 5,
      [EventPriority.NORMAL]: 1,
      [EventPriority.LOW]: 0,
    };

    await this.queue.add('process-event', payload, {
      jobId: `${payload.eventId}-${payload.attemptCount}`,
      priority: priorityMap[payload.priority] || 1,
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

  async cancelJob(jobId: string): Promise<void> {
    const job = await this.queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }
}
