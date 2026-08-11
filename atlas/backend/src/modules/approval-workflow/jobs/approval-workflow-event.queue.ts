import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IApprovalWorkflowEventPayload } from '../interfaces';

@Injectable()
export class ApprovalWorkflowEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.APPROVAL_WORKFLOW_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IApprovalWorkflowEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
