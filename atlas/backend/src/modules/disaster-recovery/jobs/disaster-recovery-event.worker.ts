import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IDrEventPayload } from '../interfaces';

/**
 * DisasterRecoveryEventWorker
 *
 * Structured logging sink for policy/plan/recovery lifecycle events —
 * the same generic event-consumption pattern used by
 * `BusinessRulesEngineEventWorker`/`EnterpriseWorkflowEngineEventWorker`.
 * Owning modules that need to react to a specific event attach their
 * own consumer to this queue and filter by job name.
 */
@Processor(QUEUE_NAMES.DISASTER_RECOVERY_EVENTS)
export class DisasterRecoveryEventWorker extends WorkerHost {
  private readonly logger = new Logger(DisasterRecoveryEventWorker.name);

  async process(job: Job<IDrEventPayload>): Promise<void> {
    this.logger.log(`${job.name}: ${JSON.stringify({ executionId: job.data.executionId, planId: job.data.planId, status: job.data.status })}`);
  }
}
