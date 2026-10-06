import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IEnterpriseHealthEventPayload } from '../interfaces';

/**
 * EnterpriseHealthEventWorker
 *
 * Structured logging sink for enterprise-health-changed/degraded/failed/
 * restored and incident lifecycle events — the same generic event-
 * consumption pattern used by every other event queue this session.
 * Owning modules that need to react to a specific event attach their own
 * consumer to this queue and filter by job name.
 */
@Processor(QUEUE_NAMES.ENTERPRISE_HEALTH_EVENTS)
export class EnterpriseHealthEventWorker extends WorkerHost {
  private readonly logger = new Logger(EnterpriseHealthEventWorker.name);

  async process(job: Job<IEnterpriseHealthEventPayload>): Promise<void> {
    this.logger.log(`${job.name}: ${JSON.stringify({ organizationId: job.data.organizationId, scope: job.data.scope, scopeRef: job.data.scopeRef, level: job.data.level, incidentId: job.data.incidentId })}`);
  }
}
