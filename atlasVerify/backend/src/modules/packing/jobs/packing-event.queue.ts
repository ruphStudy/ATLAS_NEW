import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { PackingEvent } from '../interfaces';

export interface PackingEventPayload {
  workspaceId: string;
  taskId?: string;
  taskNumber?: string;
  event: PackingEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class PackingEventQueue {
  constructor(
    @InjectQueue('packing-events')
    private readonly queue: Queue<PackingEventPayload>,
  ) {}

  async enqueue(payload: PackingEventPayload): Promise<void> {
    await this.queue.add('packing-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
