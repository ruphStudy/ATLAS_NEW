import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IDocumentEventPayload } from '../interfaces';

@Injectable()
export class DocumentEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.DOCUMENT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IDocumentEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
