import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ReturnSyncEventPayload } from '../interfaces';

@Injectable()
export class ReturnSyncEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_RETURN_SYNC_EVENTS)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: ReturnSyncEventPayload): Promise<void> {
    await this.queue.add('return-sync-event', payload, {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });
  }
}
