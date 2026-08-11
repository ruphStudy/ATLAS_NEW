import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IQuotaManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.QUOTA_MANAGEMENT_EVENTS)
export class QuotaManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(QuotaManagementEventWorker.name);

  async process(job: Job<IQuotaManagementEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: ${job.data.resourceKey} (${job.data.entityId})`);
  }
}
