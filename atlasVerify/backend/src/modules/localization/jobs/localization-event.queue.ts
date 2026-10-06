import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ILocalizationEventPayload } from '../interfaces';

@Injectable()
export class LocalizationEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.LOCALIZATION_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ILocalizationEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
