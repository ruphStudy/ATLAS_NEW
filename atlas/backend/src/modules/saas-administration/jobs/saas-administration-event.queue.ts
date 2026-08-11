import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasAdminEventPayload } from '../interfaces';

@Injectable()
export class SaasAdministrationEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISaasAdminEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
