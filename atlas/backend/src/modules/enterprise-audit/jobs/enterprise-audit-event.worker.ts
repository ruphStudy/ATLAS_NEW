import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IEnterpriseAuditEventPayload } from '../interfaces';

/**
 * EnterpriseAuditEventWorker
 *
 * Structured logging sink for enterprise-audit / security-alert /
 * compliance-alert events — the same generic event-consumption pattern
 * used by every other event queue this session
 * (`MonitoringFrameworkEventWorker`, `DisasterRecoveryEventWorker`, etc).
 * Owning modules that need to react to a specific event attach their own
 * consumer to this queue and filter by job name.
 */
@Processor(QUEUE_NAMES.ENTERPRISE_AUDIT_EVENTS)
export class EnterpriseAuditEventWorker extends WorkerHost {
  private readonly logger = new Logger(EnterpriseAuditEventWorker.name);

  async process(job: Job<IEnterpriseAuditEventPayload>): Promise<void> {
    this.logger.log(`${job.name}: ${JSON.stringify({ organizationId: job.data.organizationId, workspaceId: job.data.workspaceId, incidentId: job.data.incidentId })}`);
  }
}
