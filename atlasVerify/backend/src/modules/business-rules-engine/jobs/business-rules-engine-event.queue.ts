import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IRuleManagementEventPayload } from '../interfaces';

@Injectable()
export class BusinessRulesEngineEventQueue {
  constructor(
    @InjectQueue(QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS)
    private readonly queue: Queue,
  ) {}

  async publish(payload: IRuleManagementEventPayload): Promise<void> {
    await this.queue.add(payload.event, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }

  /**
   * Publishes a rule-emitted business event (the `EMIT_EVENT` action) onto
   * the same queue under its own configured name — distinct from the
   * lifecycle events above. Owning modules are expected to attach their own
   * consumer to this queue and filter by job name/module/entityType, the
   * same generic event contract established by Search Framework/Tags
   * Management this session; the engine never calls back into specific
   * business modules directly.
   */
  async publishBusinessEvent(eventName: string, payload: Record<string, unknown>): Promise<void> {
    await this.queue.add(eventName, payload, {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    });
  }
}
