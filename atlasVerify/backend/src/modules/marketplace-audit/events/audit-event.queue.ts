import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '../../../common/constants';
import { IAuditEvent } from '../interfaces';

@Injectable()
export class AuditEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MARKETPLACE_AUDIT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(event: IAuditEvent): Promise<void> {
    await this.queue.add('audit-event', event, {
      removeOnComplete: 1000,
      removeOnFail: 5000,
    });
  }

  async publishBatch(events: IAuditEvent[]): Promise<void> {
    const jobs = events.map((event) => ({
      name: 'audit-event',
      data: event,
      opts: {
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    }));

    await this.queue.addBulk(jobs);
  }
}
