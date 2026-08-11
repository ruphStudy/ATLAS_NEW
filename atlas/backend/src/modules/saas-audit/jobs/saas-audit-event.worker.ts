import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasAuditEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SAAS_AUDIT_EVENTS)
export class SaasAuditEventWorker extends WorkerHost {
  private readonly logger = new Logger(SaasAuditEventWorker.name);

  async process(job: Job<ISaasAuditEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: workspace ${job.data.workspaceId ?? 'platform'}`);
  }
}
