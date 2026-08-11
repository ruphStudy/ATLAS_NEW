import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IGuardrailEventPayload } from '../interfaces';

@Injectable()
export class AiGuardrailEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.AI_GUARDRAIL_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IGuardrailEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
