import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IUsageTrackingEventPayload } from '../interfaces';

/**
 * Drains the usage-tracking-events queue. No in-process cache to
 * invalidate — usage totals are always read fresh. This worker keeps the
 * queue processed and gives Billing/Quota-Management/Tenant-Analytics
 * consumers a place to attach their own, the same generic event contract
 * used across this session.
 */
@Processor(QUEUE_NAMES.USAGE_TRACKING_EVENTS)
export class UsageTrackingEventWorker extends WorkerHost {
  private readonly logger = new Logger(UsageTrackingEventWorker.name);

  async process(job: Job<IUsageTrackingEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: ${job.data.resourceKey} (workspace ${job.data.workspaceId})`);
  }
}
