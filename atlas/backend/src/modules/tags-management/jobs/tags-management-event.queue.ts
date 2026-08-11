import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITagsManagementEventPayload } from '../interfaces';

@Injectable()
export class TagsManagementEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.TAGS_MANAGEMENT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ITagsManagementEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
