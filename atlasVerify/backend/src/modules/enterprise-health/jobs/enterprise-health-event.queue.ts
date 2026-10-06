import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IEnterpriseHealthEventPayload } from '../interfaces';

@Injectable()
export class EnterpriseHealthEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.ENTERPRISE_HEALTH_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IEnterpriseHealthEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
