import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IOperationsHealthEventPayload } from '../interfaces';

@Injectable()
export class OperationsHealthEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.OPERATIONS_HEALTH_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IOperationsHealthEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
