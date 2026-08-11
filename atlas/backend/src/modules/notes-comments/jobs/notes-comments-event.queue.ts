import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { INotesCommentsEventPayload } from '../interfaces';

@Injectable()
export class NotesCommentsEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.NOTES_COMMENTS_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: INotesCommentsEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
