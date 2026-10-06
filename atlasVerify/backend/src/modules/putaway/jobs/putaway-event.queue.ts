import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PutawayEvent } from '../interfaces';

export interface PutawayEventPayload {
  workspaceId: string;
  taskId?: string;
  taskNumber?: string;
  event: PutawayEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PutawayEventQueue {
  constructor(
    @InjectQueue('putaway-events')
    private readonly queue: Queue<PutawayEventPayload>,
  ) {}

  async enqueue(payload: PutawayEventPayload): Promise<void> {
    await this.queue.add('putaway-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
