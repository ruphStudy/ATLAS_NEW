import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ChannelEventPayload } from '../interfaces';
import { MULTI_CHANNEL_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class MultiChannelEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(MultiChannelEventQueue.name);
  private readonly queue: Queue<ChannelEventPayload>;

  constructor() {
    this.queue = new Queue<ChannelEventPayload>(QUEUE_NAMES.MULTI_CHANNEL_EVENTS, {
      defaultJobOptions: {
        attempts: MULTI_CHANNEL_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MULTI_CHANNEL_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MULTI_CHANNEL_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MULTI_CHANNEL_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: ChannelEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue multi-channel event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
