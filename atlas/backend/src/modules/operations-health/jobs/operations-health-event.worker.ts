import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IOperationsHealthEventPayload } from '../interfaces';

/**
 * Drains the operations-health-events queue. Operations Health computes and
 * persists status synchronously in the service (no cache to invalidate here,
 * unlike Settings/Roles/Search/Theme/Rules), so this worker's only job today
 * is to keep the queue processed; other modules (e.g. an on-call paging
 * integration) may attach their own consumer to the same queue and filter
 * by event/module, the same generic event contract used across this session.
 */
@Processor(QUEUE_NAMES.OPERATIONS_HEALTH_EVENTS)
export class OperationsHealthEventWorker extends WorkerHost {
  private readonly logger = new Logger(OperationsHealthEventWorker.name);

  async process(job: Job<IOperationsHealthEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: ${job.data.module} -> ${job.data.status} (workspace ${job.data.workspaceId})`);
  }
}
