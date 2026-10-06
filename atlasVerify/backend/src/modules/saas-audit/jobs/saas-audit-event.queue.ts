import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasAuditEventPayload } from '../interfaces';

@Injectable()
export class SaasAuditEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.SAAS_AUDIT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ISaasAuditEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
