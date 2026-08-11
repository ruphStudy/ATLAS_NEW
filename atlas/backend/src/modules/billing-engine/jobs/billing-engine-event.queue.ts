import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IBillingEngineEventPayload } from '../interfaces';

@Injectable()
export class BillingEngineEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.BILLING_ENGINE_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IBillingEngineEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
