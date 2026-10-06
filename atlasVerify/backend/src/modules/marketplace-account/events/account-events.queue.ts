import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { AccountEventPayload } from '../interfaces';
import { MP_ACCOUNT_QUEUE_CONFIG } from '../constants';

@Injectable()
export class AccountEventQueue {
  private readonly logger = new Logger(AccountEventQueue.name);
  private readonly queue: Queue;

  constructor() {
    this.queue = new Queue(QUEUE_NAMES.MARKETPLACE_ACCOUNT_EVENTS, {
      defaultJobOptions: {
        attempts: MP_ACCOUNT_QUEUE_CONFIG.ATTEMPTS,
        backoff: { type: 'exponential', delay: MP_ACCOUNT_QUEUE_CONFIG.BACKOFF_MS },
        removeOnComplete: MP_ACCOUNT_QUEUE_CONFIG.REMOVE_ON_COMPLETE,
        removeOnFail: MP_ACCOUNT_QUEUE_CONFIG.REMOVE_ON_FAIL,
      },
    });
  }

  async enqueue(payload: AccountEventPayload): Promise<void> {
    try {
      await this.queue.add(payload.event, payload);
    } catch (err) {
      this.logger.warn(`Failed to enqueue account event '${payload.event}': ${(err as Error).message}`);
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }
}
