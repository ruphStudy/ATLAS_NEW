import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { RuleCacheService } from '../rule-cache.service';
import { RuleManagementEvent } from '../interfaces';

const CACHE_INVALIDATING_EVENTS: string[] = [
  RuleManagementEvent.RULE_CREATED,
  RuleManagementEvent.RULE_UPDATED,
  RuleManagementEvent.RULE_PUBLISHED,
  RuleManagementEvent.RULE_ENABLED,
  RuleManagementEvent.RULE_DISABLED,
  RuleManagementEvent.RULE_ARCHIVED,
  RuleManagementEvent.RULE_RESTORED,
  RuleManagementEvent.RULE_ROLLED_BACK,
];

@Processor(QUEUE_NAMES.BUSINESS_RULES_ENGINE_EVENTS)
export class BusinessRulesEngineEventWorker extends WorkerHost {
  private readonly logger = new Logger(BusinessRulesEngineEventWorker.name);

  constructor(private readonly cache: RuleCacheService) {
    super();
  }

  async process(job: Job<Record<string, unknown>>): Promise<void> {
    if (!CACHE_INVALIDATING_EVENTS.includes(job.name)) {
      // Either a RULE_EXECUTED/RULE_EXECUTION_FAILED lifecycle event (no cache impact), or a
      // rule-emitted business event (EMIT_EVENT action) meant for an owning module's own consumer.
      return;
    }
    this.logger.debug(`${job.name}: invalidating rule match cache`);
    this.cache.invalidateAll();
  }
}
