import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ISaasHealthEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SAAS_MONITORING_EVENTS)
export class SaasMonitoringEventWorker extends WorkerHost {
  private readonly logger = new Logger(SaasMonitoringEventWorker.name);

  async process(job: Job<ISaasHealthEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: workspace ${job.data.workspaceId} module ${job.data.module}`);
  }
}
