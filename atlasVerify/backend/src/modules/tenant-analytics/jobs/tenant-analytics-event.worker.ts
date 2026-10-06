import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { ITenantAnalyticsEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.TENANT_ANALYTICS_EVENTS)
export class TenantAnalyticsEventWorker extends WorkerHost {
  private readonly logger = new Logger(TenantAnalyticsEventWorker.name);

  async process(job: Job<ITenantAnalyticsEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: tenant ${job.data.workspaceId ?? 'platform-wide'}`);
  }
}
