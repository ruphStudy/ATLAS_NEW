import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IWorkflowEventPayload } from '../interfaces';

/**
 * EnterpriseWorkflowEngineEventWorker
 *
 * Structured logging sink for workflow lifecycle/step/failure/escalation/
 * completion events, the same generic event-consumption pattern used by
 * `BusinessRulesEngineEventWorker`. Owning modules that need to react to
 * a specific event (e.g. re-driving their own state machine when a
 * workflow completes) attach their own consumer to this queue and filter
 * by job name — the engine never calls back into specific business
 * modules directly.
 */
@Processor(QUEUE_NAMES.WORKFLOW_ENGINE_EVENTS)
export class EnterpriseWorkflowEngineEventWorker extends WorkerHost {
  private readonly logger = new Logger(EnterpriseWorkflowEngineEventWorker.name);

  async process(job: Job<IWorkflowEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: ${JSON.stringify({ executionId: job.data.executionId, stepId: job.data.stepId, status: job.data.status })}`);
  }
}
