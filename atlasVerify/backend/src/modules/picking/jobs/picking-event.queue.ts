import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PickingEvent } from '../interfaces';

export interface PickingEventPayload {
  workspaceId: string;
  taskId?: string;
  taskNumber?: string;
  event: PickingEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PickingEventQueue {
  constructor(
    @InjectQueue('picking-events')
    private readonly queue: Queue<PickingEventPayload>,
  ) {}

  async enqueue(payload: PickingEventPayload): Promise<void> {
    await this.queue.add('picking-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
