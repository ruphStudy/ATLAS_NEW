import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IAuditEventPayload } from '../interfaces';

@Injectable()
export class AuditLogEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.AUDIT_LOG_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IAuditEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
