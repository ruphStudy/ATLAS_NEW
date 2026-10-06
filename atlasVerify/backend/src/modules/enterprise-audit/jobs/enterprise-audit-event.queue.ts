import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IEnterpriseAuditEventPayload } from '../interfaces';

@Injectable()
export class EnterpriseAuditEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.ENTERPRISE_AUDIT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IEnterpriseAuditEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
