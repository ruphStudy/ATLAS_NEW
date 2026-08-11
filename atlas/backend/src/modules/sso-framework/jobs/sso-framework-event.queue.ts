import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISsoFrameworkEventPayload } from '../interfaces';

@Injectable()
export class SsoFrameworkEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SSO_FRAMEWORK_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISsoFrameworkEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
