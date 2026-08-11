import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ReorderEvent } from '../interfaces';

export interface ReorderEventPayload {
  event: ReorderEvent;
  workspaceId: string;
  inventoryItemId: string;
  sku?: string | null;
  warehouseId?: string | null;
  recommendationId?: string;
  stockLevelStatus?: string;
  currentStock?: number;
  reorderPoint?: number;
  recommendedQuantity?: number;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class ReorderEventQueue {
  constructor(
    @InjectQueue('reorder-events') private readonly queue: Queue,
  ) {}

  async publish(payload: ReorderEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
