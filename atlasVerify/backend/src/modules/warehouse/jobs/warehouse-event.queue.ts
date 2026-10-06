import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { WarehouseEvent } from '../interfaces';

export interface WarehouseEventPayload {
  warehouseId: string;
  code: string;
  workspaceId: string;
  event: WarehouseEvent;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class WarehouseEventQueue {
  constructor(
    @InjectQueue('warehouse-events') private readonly queue: Queue<WarehouseEventPayload>,
  ) {}

  async enqueue(payload: WarehouseEventPayload): Promise<void> {
    await this.queue.add('warehouse-event', payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 50 },
      removeOnFail: { count: 20 },
    });
  }
}
