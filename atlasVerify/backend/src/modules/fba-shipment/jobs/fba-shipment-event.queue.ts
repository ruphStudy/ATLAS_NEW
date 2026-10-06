import { Queue } from 'bullmq';
import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { FBAShipmentEvent } from '../interfaces';

export interface FBAShipmentEventPayload {
  event: FBAShipmentEvent;
  shipmentId: string;
  workspaceId: string;
  marketplaceAccountId: string;
  externalShipmentId?: string | null;
  status?: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class FBAShipmentEventQueue {
  constructor(
    @InjectQueue('fba-shipment-events') private readonly queue: Queue,
  ) {}

  async publish(payload: FBAShipmentEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      removeOnComplete: 100,
      removeOnFail: 500,
    });
  }
}
