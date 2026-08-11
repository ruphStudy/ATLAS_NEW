import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { BarcodeEvent } from '../interfaces';

export interface BarcodeEventPayload {
  workspaceId: string;
  barcodeId?: string;
  event: BarcodeEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class BarcodeEventQueue {
  constructor(
    @InjectQueue('barcode-events')
    private readonly queue: Queue<BarcodeEventPayload>,
  ) {}

  async enqueue(payload: BarcodeEventPayload): Promise<void> {
    await this.queue.add('barcode-event', payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
    });
  }
}
