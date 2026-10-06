import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { AvailabilityEvent } from '../interfaces';

export interface AvailabilityEventPayload {
  event: AvailabilityEvent;
  inventoryItemId: string;
  workspaceId: string;
  sku?: string | null;
  warehouseId?: string | null;
  availableToSell?: number;
  availableToPromise?: number;
  threshold?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class AvailabilityEventQueue {
  constructor(
    @InjectQueue('inventory-availability-events') private readonly queue: Queue,
  ) {}

  async publish(payload: AvailabilityEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
