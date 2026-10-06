import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { CurrencyEventPayload } from '../interfaces';
import { CURRENCY_EVENT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class CurrencyEventQueue implements OnModuleDestroy {
  private readonly logger = new Logger(CurrencyEventQueue.name);
  private readonly queue: Queue<CurrencyEventPayload>;

  constructor() {
    this.queue = new Queue<CurrencyEventPayload>(QUEUE_NAMES.CURRENCY_EVENTS, {
      defaultJobOptions: {
        attempts: CURRENCY_EVENT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: CURRENCY_EVENT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: CURRENCY_EVENT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: CURRENCY_EVENT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: CurrencyEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue currency event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
