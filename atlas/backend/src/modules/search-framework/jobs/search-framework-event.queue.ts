import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISearchFrameworkEventPayload, ISearchDocument } from '../interfaces';

@Injectable()
export class SearchFrameworkEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SEARCH_FRAMEWORK_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISearchFrameworkEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /** Queue-based bulk indexing — the worker performs the actual upsert against the search provider. */
  async enqueueIndexJob(workspaceId: string, doc: Partial<ISearchDocument>): Promise<void> {
    await this.queue.add(
      'index-document',
      { workspaceId, doc },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );
  }
}
