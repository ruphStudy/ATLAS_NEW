import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { BusinessEventPayload } from '../interfaces';
import { MULTI_BUSINESS_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MultiBusinessEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MultiBusinessEventQueue.name);
  private readonly queue: Queue<BusinessEventPayload>;

  constructor() {
    this.queue = new Queue<BusinessEventPayload>(QUEUE_NAMES.MULTI_BUSINESS_EVENTS, {
      defaultJobOptions: {
        attempts: MULTI_BUSINESS_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MULTI_BUSINESS_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MULTI_BUSINESS_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MULTI_BUSINESS_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: BusinessEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue multi-business event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
