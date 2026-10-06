import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { QUEUE_NAMES } from '@common/constants';
import { IBillingEngineEventPayload } from '../interfaces';

/**
 * Drains the billing-engine-events queue. Billing periods are always read
 * fresh from the database (no cache to invalidate) — this worker's role is
 * to keep the queue processed and to give a Payment Provider Framework (or
 * an overdue-notification consumer) a place to attach its own consumer,
 * the same generic event contract used across this session.
 */
@Processor(QUEUE_NAMES.BILLING_ENGINE_EVENTS)
export class BillingEngineEventWorker extends WorkerHost {
  private readonly logger = new Logger(BillingEngineEventWorker.name);

  async process(job: Job<IBillingEngineEventPayload>): Promise<void> {
    this.logger.debug(`${job.name}: billing period ${job.data.billingPeriodId} (workspace ${job.data.workspaceId})`);
  }
}
