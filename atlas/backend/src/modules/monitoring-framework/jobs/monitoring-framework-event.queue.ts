import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IMonitoringFrameworkEventPayload } from '../interfaces';

@Injectable()
export class MonitoringFrameworkEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.MONITORING_FRAMEWORK_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IMonitoringFrameworkEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
