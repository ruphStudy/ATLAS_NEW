import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { SubscriptionCacheService } from '../subscription-cache.service';
import { ISubscriptionManagementEventPayload } from '../interfaces';

@Processor(QUEUE_NAMES.SUBSCRIPTION_MANAGEMENT_EVENTS)
export class SubscriptionManagementEventWorker extends WorkerHost {
  private readonly logger = new Logger(SubscriptionManagementEventWorker.name);

  constructor(private readonly cache: SubscriptionCacheService) {
    super();
  }

  async process(job: Job<ISubscriptionManagementEventPayload>): Promise<void> {
    const { event, workspaceId } = job.data;
    this.logger.debug(`${event}: subscription ${job.data.subscriptionId}`);

    if (workspaceId) {
      this.cache.invalidateWorkspace(workspaceId);
    } else {
      // An ORGANIZATION-scoped subscription can be the effective fallback for any number of workspaces — clear the whole cache, the same trade-off Settings/Theme make for their own GLOBAL-scope writes.
      this.cache.invalidateAll();
    }
  }
}
