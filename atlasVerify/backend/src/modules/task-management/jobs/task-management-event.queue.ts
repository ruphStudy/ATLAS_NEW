import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITaskManagementEventPayload } from '../interfaces';

@Injectable()
export class TaskManagementEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.TASK_MANAGEMENT_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: ITaskManagementEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
