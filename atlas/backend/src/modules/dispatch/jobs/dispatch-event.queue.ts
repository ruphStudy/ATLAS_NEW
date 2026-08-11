import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { DispatchEvent } from '../interfaces';

export interface DispatchEventPayload {
  workspaceId: string;
  taskId?: string;
  taskNumber?: string;
  event: DispatchEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class DispatchEventQueue {
  constructor(
    @InjectQueue('dispatch-events')
    private readonly queue: Queue<DispatchEventPayload>,
  ) {}

  async enqueue(payload: DispatchEventPayload): Promise<void> {
    await this.queue.add('dispatch-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
