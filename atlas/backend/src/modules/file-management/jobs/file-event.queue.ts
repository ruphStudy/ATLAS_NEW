import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IFileEventPayload } from '../interfaces';

@Injectable()
export class FileEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.FILE_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IFileEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
