import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IFeatureFlagEventPayload } from '../interfaces';

@Injectable()
export class FeatureFlagsEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.FEATURE_FLAGS_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IFeatureFlagEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
