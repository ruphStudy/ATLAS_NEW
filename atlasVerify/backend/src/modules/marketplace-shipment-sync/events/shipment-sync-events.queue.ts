import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { ShipmentSyncEventPayload } from '../interfaces';

@Injectable()
export class ShipmentSyncEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_SHIPMENT_SYNC_EVENTS)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: ShipmentSyncEventPayload): Promise<void> {
    await this.queue.add('shipment-sync-event', payload, {
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    });
  }
}
