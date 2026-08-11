import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISettingsEventPayload } from '../interfaces';

@Injectable()
export class SettingsEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SETTINGS_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISettingsEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
