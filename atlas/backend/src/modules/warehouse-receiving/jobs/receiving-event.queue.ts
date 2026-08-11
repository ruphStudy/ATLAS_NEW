import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { ReceivingEvent } from '../interfaces';

export interface ReceivingEventPayload {
  workspaceId: string;
  receivingId?: string;
  receivingNumber?: string;
  event: ReceivingEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ReceivingEventQueue {
  constructor(
    @InjectQueue('receiving-events')
    private readonly queue: Queue<ReceivingEventPayload>,
  ) {}

  async enqueue(payload: ReceivingEventPayload): Promise<void> {
    await this.queue.add('receiving-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
