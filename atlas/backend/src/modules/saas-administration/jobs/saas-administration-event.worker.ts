import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasAdminEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SAAS_ADMINISTRATION_EVENTS)
export class SaasAdministrationEventWorker extends WorkerHost {
  private readonly logger = new Logger(SaasAdministrationEventWorker.name);

  async process(job: Job<ISaasAdminEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: tenant ${job.data.targetWorkspaceId ?? 'n/a'} by ${job.data.performedBy}`);
  }
}
